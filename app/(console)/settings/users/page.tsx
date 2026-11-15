"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

import {
  useDeleteUser,
  useUpdateRole,
  useUsers,
  type Role,
  type User,
} from "@/hooks/use-users";
import { apiErrorMessage } from "@/lib/ai-config";
import { useAuthStore } from "@/store/auth";
import { ConfirmButton } from "@/components/ui/confirm-button";
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

const ROLES: Role[] = ["ADMIN", "ENGINEER", "VIEWER"];

function MemberRow({ user, isSelf }: { user: User; isSelf: boolean }) {
  const updateRole = useUpdateRole();
  const remove = useDeleteUser();

  return (
    <TableRow>
      <TableCell className="pl-6 font-medium">
        {user.email}
        {isSelf && (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            you
          </span>
        )}
      </TableCell>
      <TableCell>
        {isSelf ? (
          <Badge
            variant="outline"
            className={`text-xs ${ROLE_CLASS[user.role] ?? ""}`}
          >
            {user.role}
          </Badge>
        ) : (
          <Select
            value={user.role}
            disabled={updateRole.isPending}
            onValueChange={(role) =>
              updateRole.mutate(
                { userId: user.userId, role: role as Role },
                {
                  onSuccess: () => toast.success("Role updated"),
                  onError: (e) =>
                    toast.error(
                      apiErrorMessage(e, "Could not change the role")
                    ),
                }
              )
            }
          >
            <SelectTrigger
              className="h-8 w-32 text-xs"
              aria-label={`Role of ${user.email}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r} className="text-xs">
                  {r.charAt(0) + r.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </TableCell>
      <TableCell className="text-right text-sm text-muted-foreground max-sm:hidden">
        {format(new Date(user.createdAt), "MMM d, yyyy")}
      </TableCell>
      <TableCell className="w-24 pr-4 text-right">
        {!isSelf && (
          <ConfirmButton
            label={`Remove ${user.email}`}
            confirmLabel="Remove"
            pending={remove.isPending}
            onConfirm={() =>
              remove.mutate(user.userId, {
                onSuccess: () => toast.success("Member removed"),
                onError: (e) =>
                  toast.error(
                    apiErrorMessage(e, "Could not remove the member")
                  ),
              })
            }
          />
        )}
      </TableCell>
    </TableRow>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MembersPage() {
  const [showForm, setShowForm] = useState(false);
  const { data: users, isLoading } = useUsers();
  const selfId = useAuthStore((s) => s.userId);

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
                <TableHead className="w-40 text-right max-sm:hidden">
                  Joined
                </TableHead>
                <TableHead className="w-24 pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {[1, 2, 3, 4].map((j) => (
                      <TableCell
                        key={j}
                        className={
                          j === 1 ? "pl-6" : j === 3 ? "max-sm:hidden" : ""
                        }
                      >
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !users?.length ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No members found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <MemberRow
                    key={user.userId}
                    user={user}
                    isSelf={user.userId === selfId}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
