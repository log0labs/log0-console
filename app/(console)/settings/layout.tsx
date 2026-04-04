"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SETTINGS_TABS = [
  { href: "/settings/workspace", label: "Workspace" },
  { href: "/settings/users", label: "Members" },
  { href: "/settings/api-keys", label: "API Keys" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full">
      {/* Secondary left panel */}
      <aside className="w-[200px] shrink-0 border-r bg-background">
        <div className="px-4 py-4">
          <p className="mb-3 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Settings
          </p>
          <nav className="flex flex-col gap-0.5">
            {SETTINGS_TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors",
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
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  );
}
