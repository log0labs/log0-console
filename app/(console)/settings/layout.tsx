"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { SectionLabel } from "@/components/ui/section-label";

const SETTINGS_TABS = [
  { href: "/settings/workspace", label: "Workspace" },
  { href: "/settings/users", label: "Members" },
  { href: "/settings/api-keys", label: "API Keys" },
  { href: "/settings/ai", label: "AI" },
  { href: "/settings/repositories", label: "Repositories" },
  { href: "/settings/runbooks", label: "Runbooks" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const authReady = useAuthStore((s) => s.authReady);

  useEffect(() => {
    if (authReady && role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [authReady, role, router]);

  if (!authReady || role !== "ADMIN") return null;

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Secondary left panel */}
      <aside className="shrink-0 border-b bg-background md:w-50 md:border-r md:border-b-0">
        <div className="px-4 py-3 md:py-4">
          <SectionLabel className="mb-3 max-md:hidden">Settings</SectionLabel>
          <nav className="flex gap-0.5 overflow-x-auto [scrollbar-width:none] md:flex-col">
            {SETTINGS_TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "shrink-0 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors",
                  pathname === tab.href
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      {/* Settings content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
    </div>
  );
}
