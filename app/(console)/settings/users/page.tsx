"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

import { useUsers } from "@/hooks/use-users";
import { authApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ── Role badge - central tokens (lib/theme/tokens.ts) ─────────────────────────
import { roleBadge as ROLE_CLASS } from "@/lib/theme/tokens";

// ── Create user form ──────────────────────────────────────────────────────────

const createSchema = z
  .object({
    email: z.string().email("Enter a valid email"),
    role: z.enum(["ADMIN", "ENGINEER", "VIEWER"]),
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type CreateForm = z.infer<typeof createSchema>;

function AddMemberForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: "ENGINEER" },
  });

  const create = useMutation({
    mutationFn: (values: CreateForm) =>
      authApi.post("/api/v1/users", {
        email: values.email,
        role: values.role,
        password: values.password,
      }),
    onSuccess: () => {
      toast.success("Member added");
      reset();
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to add member";
      toast.error(msg);
    },
  });

  return (
    <form
      onSubmit={handleSubmit((v) => create.mutate(v))}
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="colleague@company.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Role</Label>
          <Select
            /* eslint-disable-next-line react-hooks/incompatible-library */
            value={watch("role")}
            onValueChange={(v) =>
              setValue("role", v as "ADMIN" | "ENGINEER" | "VIEWER")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="ENGINEER">Engineer</SelectItem>
              <SelectItem value="VIEWER">Viewer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Min. 8 characters"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <Button type="submit" size="sm" disabled={create.isPending}>
          {create.isPending ? "Adding…" : "Add member"}
        </Button>
      </div>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MembersPage() {
  const [showForm, setShowForm] = useState(false);
  const { data: users, isLoading } = useUsers();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Members</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage who has access to this workspace.
          </p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            Add member
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pt-5 pb-2">
            <CardTitle className="text-sm font-medium">New member</CardTitle>
            <CardDescription>
              Create an account for a teammate. Share the password with them
              directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-5">
            <AddMemberForm onSuccess={() => setShowForm(false)} />
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pt-5 pb-2">
          <CardTitle className="text-sm font-medium">
            {isLoading ? "Members" : `Members (${users?.length ?? 0})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Email</TableHead>
                <TableHead className="w-32">Role</TableHead>
                <TableHead className="w-40 pr-6 text-right">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {[1, 2, 3].map((j) => (
                      <TableCell
                        key={j}
                        className={j === 1 ? "pl-6" : j === 3 ? "pr-6" : ""}
                      >
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !users?.length ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No members found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell className="pl-6 font-medium">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${ROLE_CLASS[user.role] ?? ""}`}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right text-sm text-muted-foreground">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
