"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { authApi } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const slugPattern = /^[a-z0-9-]+$/;

const registerSchema = z
  .object({
    tenantName: z
      .string()
      .min(2, "Workspace name must be at least 2 characters"),
    slug: z
      .string()
      .min(2, "Slug must be at least 2 characters")
      .regex(
        slugPattern,
        "Slug must contain only lowercase letters, digits, and hyphens"
      ),
    adminEmail: z.string().email("Enter a valid email"),
    adminPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.adminPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  function handleTenantNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue("tenantName", e.target.value);
    setValue("slug", toSlug(e.target.value), { shouldValidate: false });
  }

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null);
    try {
      await authApi.post("/api/v1/tenants/register", {
        tenantName: values.tenantName,
        slug: values.slug,
        adminEmail: values.adminEmail,
        adminPassword: values.adminPassword,
      });

      toast.success("Workspace created! Sign in to continue.");
      router.push("/login");
    } catch (err: unknown) {
      const data = (
        err as { response?: { data?: { error?: string; details?: string[] } } }
      )?.response?.data;
      const message =
        data?.details?.join(", ") ??
        data?.error ??
        "Something went wrong. Please try again.";
      setServerError(message);
      toast.error(message);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create a workspace</CardTitle>
        <CardDescription>Set up your team&apos;s log0 account</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="tenantName">Workspace name</Label>
            <Input
              id="tenantName"
              type="text"
              placeholder="Acme Corp"
              autoComplete="organization"
              {...register("tenantName")}
              onChange={handleTenantNameChange}
            />
            {errors.tenantName && (
              <p className="text-xs text-destructive">
                {errors.tenantName.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug">
              Slug{" "}
              <span className="text-xs text-muted-foreground">
                (unique identifier, auto-filled)
              </span>
            </Label>
            <Input
              id="slug"
              type="text"
              placeholder="acme-corp"
              {...register("slug")}
            />
            {errors.slug && (
              <p className="text-xs text-destructive">{errors.slug.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adminEmail">Admin email</Label>
            <Input
              id="adminEmail"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              {...register("adminEmail")}
            />
            {errors.adminEmail && (
              <p className="text-xs text-destructive">
                {errors.adminEmail.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adminPassword">Password</Label>
            <Input
              id="adminPassword"
              type="password"
              autoComplete="new-password"
              {...register("adminPassword")}
            />
            {errors.adminPassword && (
              <p className="text-xs text-destructive">
                {errors.adminPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="mt-2 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating workspace…" : "Create workspace"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-foreground underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
