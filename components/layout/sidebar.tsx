"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Home01Icon,
  Alert01Icon,
  FileTerminalIcon,
  Settings01Icon,
  Logout01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";

import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", icon: Home01Icon, label: "Dashboard" },
  { href: "/incidents", icon: Alert01Icon, label: "Incidents" },
  { href: "/logs", icon: FileTerminalIcon, label: "Logs" },
];

function NavLink({
  href,
  icon,
  label,
  collapsed,
  active,
}: {
  href: string;
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  label: string;
  collapsed: boolean;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
        collapsed && "justify-center",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60"
      )}
    >
      <HugeiconsIcon icon={icon} size={18} className="shrink-0" />
      {!collapsed && label}
    </Link>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const pathname = usePathname();
  const role = useAuthStore((s) => s.role);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const isSettingsActive = pathname.startsWith("/settings");

  async function handleLogout() {
    clearAuth();
    await fetch("/api/auth/cookie", { method: "DELETE" });
    window.location.href = "/login";
  }

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r bg-sidebar transition-all duration-200",
        collapsed ? "w-[52px]" : "w-[220px]"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-12 shrink-0 items-center border-b px-3",
          collapsed ? "justify-center" : "gap-2.5"
        )}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          L
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight">log0</span>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            collapsed={collapsed}
            active={
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                pathname.startsWith(item.href + "/"))
            }
          />
        ))}
      </nav>

      {/* Bottom: settings (admin) + logout + collapse */}
      <div className="flex shrink-0 flex-col gap-1 border-t p-2">
        {role === "ADMIN" && (
          <Link
            href="/settings/workspace"
            title={collapsed ? "Settings" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
              collapsed && "justify-center",
              isSettingsActive
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60"
            )}
          >
            <HugeiconsIcon
              icon={Settings01Icon}
              size={18}
              className="shrink-0"
            />
            {!collapsed && "Settings"}
          </Link>
        )}

        <button
          onClick={handleLogout}
          title={collapsed ? "Log out" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60",
            collapsed && "justify-center"
          )}
        >
          <HugeiconsIcon icon={Logout01Icon} size={18} className="shrink-0" />
          {!collapsed && "Log out"}
        </button>

        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/60",
            collapsed && "justify-center"
          )}
        >
          <HugeiconsIcon
            icon={collapsed ? ArrowRight01Icon : ArrowLeft01Icon}
            size={18}
            className="shrink-0"
          />
          {!collapsed && "Collapse"}
        </button>
      </div>
    </aside>
  );
}
