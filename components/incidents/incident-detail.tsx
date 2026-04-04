"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { useIncident } from "@/hooks/use-incident";
import { useIncidentLogs } from "@/hooks/use-incident-logs";
import { incidentsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { IncidentStatus, Severity } from "@/types/incident";

// Badge configs (same as list page)

const SEVERITY_CLASS: Record<Severity, string> = {
  CRITICAL: "bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400",
  HIGH: "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400",
  MEDIUM:
    "bg-yellow-500/15 text-yellow-600 border-yellow-500/30 dark:text-yellow-400",
  LOW: "bg-blue-500/15 text-blue-500 border-blue-500/30 dark:text-blue-400",
};

const STATUS_CLASS: Record<IncidentStatus, string> = {
  NEW: "bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400",
  ASSIGNED:
    "bg-yellow-500/15 text-yellow-600 border-yellow-500/30 dark:text-yellow-400",
  ACKNOWLEDGED:
    "bg-blue-500/15 text-blue-500 border-blue-500/30 dark:text-blue-400",
  RESOLVED:
    "bg-green-500/15 text-green-600 border-green-500/30 dark:text-green-400",
};

const STATUS_LABEL: Record<IncidentStatus, string> = {
  NEW: "New",
  ASSIGNED: "Assigned",
  ACKNOWLEDGED: "Acknowledged",
  RESOLVED: "Resolved",
};

// Helpers───────────────────────────

function timeAgo(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

function fmtDate(iso: string) {
  return format(new Date(iso), "MMM d, yyyy HH:mm");
}

// Main component────────────────────

export function IncidentDetail({ incidentId }: { incidentId: string }) {
  const role = useAuthStore((s) => s.role);
  const tenantId = useAuthStore((s) => s.tenantId);
  const queryClient = useQueryClient();

  const { data: incident, isLoading, isError } = useIncident(incidentId);
  const { data: logsPage } = useIncidentLogs(incidentId);

  const canAct = role === "ADMIN" || role === "ENGINEER";

  const acknowledge = useMutation({
    mutationFn: () =>
      incidentsApi.patch(`/api/v1/incidents/${incidentId}/acknowledge`, null, {
        params: { tenantId },
      }),
    onSuccess: () => {
      toast.success("Incident acknowledged");
      queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
    onError: () => toast.error("Failed to acknowledge incident"),
  });

  const resolve = useMutation({
    mutationFn: () =>
      incidentsApi.patch(`/api/v1/incidents/${incidentId}/resolve`, null, {
        params: { tenantId },
      }),
    onSuccess: () => {
      toast.success("Incident resolved");
      queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
    onError: () => toast.error("Failed to resolve incident"),
  });

  // Loading / error states────────

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (isError || !incident) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Failed to load incident.
      </div>
    );
  }

  // Action buttons────────────────

  const showAcknowledge =
    canAct && (incident.status === "NEW" || incident.status === "ASSIGNED");
  const showResolve = canAct && incident.status === "ACKNOWLEDGED";

  // Render────────────────────────

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Service + badges */}
      <div className="flex flex-col gap-2">
        <h2 className="text-lg leading-tight font-semibold">
          {incident.serviceName}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {incident.environment}
          </span>
          <Badge
            variant="outline"
            className={SEVERITY_CLASS[incident.severity]}
          >
            {incident.severity}
          </Badge>
          <Badge variant="outline" className={STATUS_CLASS[incident.status]}>
            {STATUS_LABEL[incident.status]}
          </Badge>
        </div>
      </div>

      {/* Action buttons */}
      {(showAcknowledge || showResolve) && (
        <div className="flex gap-2">
          {showAcknowledge && (
            <Button
              size="sm"
              variant="outline"
              disabled={acknowledge.isPending}
              onClick={() => acknowledge.mutate()}
            >
              {acknowledge.isPending ? "Acknowledging…" : "Acknowledge"}
            </Button>
          )}
          {showResolve && (
            <Button
              size="sm"
              variant="outline"
              className="border-green-500/40 text-green-600 hover:bg-green-500/10 dark:text-green-400"
              disabled={resolve.isPending}
              onClick={() => resolve.mutate()}
            >
              {resolve.isPending ? "Resolving…" : "Resolve"}
            </Button>
          )}
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Occurrences</p>
          <p className="font-mono font-medium">
            {incident.occurrenceCount.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Fingerprint</p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {incident.fingerprint.slice(0, 12)}…
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Last seen</p>
          <p>{fmtDate(incident.lastSeenAt)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">First seen</p>
          <p>{fmtDate(incident.firstSeenAt)}</p>
        </div>
        {incident.resolvedAt && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Resolved</p>
            <p>{fmtDate(incident.resolvedAt)}</p>
          </div>
        )}
      </div>

      {/* AI Summary */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          AI Summary
        </p>
        {incident.aiSummary == null ? (
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-4">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
            <Skeleton className="h-3.5 w-4/6" />
            <p className="mt-1 text-xs text-muted-foreground">
              Generating summary…
            </p>
          </div>
        ) : (
          <p className="rounded-lg border bg-muted/20 p-4 text-sm leading-relaxed">
            {incident.aiSummary}
          </p>
        )}
      </div>

      {/* Status history */}
      {incident.statusHistory && incident.statusHistory.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Status History
          </p>
          <div className="flex flex-col gap-0">
            {incident.statusHistory.map((entry, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <div className="mt-1.5 flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-border ring-2 ring-background" />
                  {i < incident.statusHistory!.length - 1 && (
                    <div className="mt-1 h-full w-px bg-border" />
                  )}
                </div>
                <div className="flex flex-1 items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className={STATUS_CLASS[entry.status]}
                  >
                    {STATUS_LABEL[entry.status]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(entry.changedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log samples */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Log Samples
        </p>
        <div className="flex flex-col gap-1.5">
          {(logsPage?.content ?? []).length > 0
            ? logsPage!.content.map((log) => (
                <div
                  key={log.logId}
                  className="rounded-md border bg-muted/20 p-3 text-xs"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-mono font-medium text-red-500">
                      {log.level}
                    </span>
                    <span className="text-muted-foreground">
                      {fmtDate(log.timestamp)}
                    </span>
                  </div>
                  <p className="font-mono leading-snug">{log.message}</p>
                  {log.trace && (
                    <pre className="mt-1.5 max-h-24 overflow-y-auto whitespace-pre-wrap text-muted-foreground">
                      {log.trace}
                    </pre>
                  )}
                </div>
              ))
            : incident.topMessages.map((msg, i) => (
                <div
                  key={i}
                  className="rounded-md border bg-muted/20 p-3 font-mono text-xs leading-snug"
                >
                  {msg}
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
