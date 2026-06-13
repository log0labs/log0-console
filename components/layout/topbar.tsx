"use client";

import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { roleBadge as ROLE_CLASS } from "@/lib/theme/tokens";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/incidents": "Incidents",
  "/logs": "Logs",
  "/settings/users": "Settings · Members",
  "/settings/api-keys": "Settings · API Keys",
  "/settings/workspace": "Settings · Workspace",
};

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/incidents/")) return "Incident Detail";
  return "log0";
}

export function Topbar() {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.role);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b bg-background px-4">
      <span className="text-sm font-medium">{getTitle(pathname)}</span>
      <div className="flex items-center gap-2">
        {role && (
          <Badge variant="outline" className={cn("text-xs", ROLE_CLASS[role])}>
            {role}
          </Badge>
        )}
      </div>
    </header>
  );
}
