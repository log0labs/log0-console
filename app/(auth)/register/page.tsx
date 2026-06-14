"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { authApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GeistPixelLine } from "geist/font/pixel";

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
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-2 lg:hidden">
        {/* <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          L
        </span> */}
        <a
          href="https://log0.vercel.app/"
          className={`${GeistPixelLine.className} text-lg font-medium tracking-tight`}
        >
          log0
        </a>
      </div>

      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create a workspace
        </h1>
        <p className="text-sm text-muted-foreground">
          Set up your team&apos;s log0 account
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
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
        <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating workspace…" : "Create workspace"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-foreground underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
