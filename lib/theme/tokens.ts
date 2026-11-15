/**
 * Central color tokens for the console - the ONLY place components/charts
 * reference data colors. Values are CSS-variable references (defined in
 * app/globals.css), so they auto-adapt to the active theme + light/dark and a
 * color change means editing one CSS var, never component code.
 *
 * Recharts accepts `var(--x)` strings directly, so charts use the *Fill maps.
 * Badges/text use the *Badge class maps (Tailwind utilities generated from the
 * @theme mappings in globals.css).
 */
import type { IncidentStatus, Severity } from "@/types/incident";
import type { InvestigationStatus } from "@/types/investigation";

/* ---- fills (charts / dots / swatches) ---------------------------------- */
export const severityFill: Record<Severity, string> = {
  CRITICAL: "var(--severity-critical)",
  HIGH: "var(--severity-high)",
  MEDIUM: "var(--severity-medium)",
  LOW: "var(--severity-low)",
};

export const statusFill: Record<IncidentStatus, string> = {
  NEW: "var(--status-new)",
  ASSIGNED: "var(--status-assigned)",
  ACKNOWLEDGED: "var(--status-acknowledged)",
  RESOLVED: "var(--status-resolved)",
};

export const chartAccent = "var(--chart-1)"; // brand green
export const chartPurple = "var(--accent-purple)";
export const dataGrey = "var(--data-grey)";
export const chartSeries = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/* ---- badge classes (tinted: 15% bg, full text, 30% border) ------------- */
// NOTE: keep these as full literal strings so Tailwind's scanner picks them up.
export const severityBadge: Record<Severity, string> = {
  CRITICAL:
    "bg-severity-critical/15 text-severity-critical border-severity-critical/30",
  HIGH: "bg-severity-high/15 text-severity-high border-severity-high/30",
  MEDIUM:
    "bg-severity-medium/15 text-severity-medium border-severity-medium/30",
  LOW: "bg-severity-low/15 text-severity-low border-severity-low/30",
};

export const statusBadge: Record<IncidentStatus, string> = {
  NEW: "bg-status-new/15 text-status-new border-status-new/30",
  ASSIGNED:
    "bg-status-assigned/15 text-status-assigned border-status-assigned/30",
  ACKNOWLEDGED:
    "bg-status-acknowledged/15 text-status-acknowledged border-status-acknowledged/30",
  RESOLVED:
    "bg-status-resolved/15 text-status-resolved border-status-resolved/30",
};

/* log levels - reuse the severity scale (error≈critical, warn≈high, info≈low) */
export const logLevelBadge: Record<string, string> = {
  ERROR:
    "bg-severity-critical/15 text-severity-critical border-severity-critical/30",
  WARN: "bg-severity-high/15 text-severity-high border-severity-high/30",
  INFO: "bg-severity-low/15 text-severity-low border-severity-low/30",
  DEBUG: "bg-muted text-muted-foreground border-border",
};
export const logLevelText: Record<string, string> = {
  ERROR: "text-severity-critical",
  WARN: "text-severity-high",
  INFO: "text-severity-low",
  DEBUG: "text-muted-foreground",
};

/* RBAC roles - admin=brand, engineer=secondary(purple), viewer=neutral */
export const roleBadge: Record<string, string> = {
  ADMIN: "bg-primary/15 text-primary border-primary/30",
  ENGINEER: "bg-accent-purple/15 text-accent-purple border-accent-purple/30",
  VIEWER: "bg-muted text-muted-foreground border-border",
};

/* evidence kinds in an investigation - one hue per source so a list scans by color */
export const evidenceKindBadge: Record<string, string> = {
  log: "bg-severity-low/15 text-severity-low border-severity-low/30",
  timeline: "bg-severity-low/15 text-severity-low border-severity-low/30",
  incident: "bg-severity-high/15 text-severity-high border-severity-high/30",
  code: "bg-primary/15 text-primary border-primary/30",
  commit: "bg-accent-purple/15 text-accent-purple border-accent-purple/30",
  runbook:
    "bg-severity-medium/15 text-severity-medium border-severity-medium/30",
  doc: "bg-muted text-muted-foreground border-border",
  memory: "bg-accent-purple/15 text-accent-purple border-accent-purple/30",
};

export const statusLabel: Record<IncidentStatus, string> = {
  NEW: "New",
  ASSIGNED: "Assigned",
  ACKNOWLEDGED: "Acknowledged",
  RESOLVED: "Resolved",
};

export const investigationStatusLabel: Record<InvestigationStatus, string> = {
  QUEUED: "Queued",
  RUNNING: "Running",
  AWAITING_REVIEW: "Needs review",
  AWAITING_PR_APPROVAL: "Needs approval",
  PUBLISHING: "Opening PR",
  COMPLETED: "Done",
  FAILED: "Failed",
  CANCELLED: "Stopped",
};

export const investigationStatusBadge: Record<InvestigationStatus, string> = {
  QUEUED: "bg-muted text-muted-foreground border-border",
  RUNNING: "bg-primary/15 text-primary border-primary/30",
  AWAITING_REVIEW:
    "bg-severity-high/15 text-severity-high border-severity-high/30",
  AWAITING_PR_APPROVAL:
    "bg-severity-high/15 text-severity-high border-severity-high/30",
  PUBLISHING: "bg-primary/15 text-primary border-primary/30",
  COMPLETED:
    "bg-status-resolved/15 text-status-resolved border-status-resolved/30",
  FAILED: "bg-destructive/10 text-destructive border-destructive/30",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};
