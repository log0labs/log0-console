"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { authApi } from "@/lib/api";
import { decodeJwt } from "@/lib/jwt";
import { links } from "@/lib/links";
import { useAuthStore } from "@/store/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SupportBanner } from "@/components/auth/support-banner";
import { GeistPixelLine } from "geist/font/pixel";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      const { data } = await authApi.post("/api/v1/auth/login", {
        email: values.email,
        password: values.password,
      });

      // Persist refresh token in httpOnly cookie via Next.js API route
      await fetch("/api/auth/cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: data.refreshToken }),
      });

      // Decode JWT to get userId, tenantId, role - more reliable than
      // depending on the login response body field names.
      const { userId, tenantId, role } = decodeJwt(data.accessToken);
      setAuth({ accessToken: data.accessToken, userId, tenantId, role });

      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Invalid email or password";
      setServerError(message);
      toast.error(message);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* mark - gives brand context on mobile (panel hidden < lg) */}
      <div className="flex items-center gap-2 lg:hidden">
        {/* <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          L
        </span> */}
        <a
          href={links.website}
          className={`${GeistPixelLine.className} text-lg font-medium tracking-tight`}
        >
          log0
        </a>
      </div>

      <SupportBanner />

      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your log0 workspace
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
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/register" className="text-foreground underline">
            Create a workspace
          </Link>
        </p>
      </form>
    </div>
  );
}
