"use client";

import { useAuthStore } from "@/store/auth";
import { AuthInitializer } from "@/components/auth-initializer";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

function AuthGate({ children }: { children: React.ReactNode }) {
  const authReady = useAuthStore((s) => s.authReady);

  if (!authReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AuthInitializer />
      <AuthGate>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </AuthGate>
    </>
  );
}
