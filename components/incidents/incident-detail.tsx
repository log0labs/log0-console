"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { useIncident } from "@/hooks/use-incident";
import { useIncidentLogs } from "@/hooks/use-incident-logs";
import { useUsers } from "@/hooks/use-users";
import { incidentsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { AiSummary } from "@/components/incidents/ai-summary";
import { InvestigationPanel } from "@/components/investigations/investigation-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionLabel } from "@/components/ui/section-label";
import {
  severityBadge as SEVERITY_CLASS,
  statusBadge as STATUS_CLASS,
  statusLabel,
  logLevelText,
} from "@/lib/theme/tokens";

// Badge styles come from lib/theme/tokens.ts (central, theme-driven).

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

function fmtDate(iso: string) {
  return format(new Date(iso), "MMM d, yyyy HH:mm");
}

// ── Assign panel (inline, ADMIN only) ─────────────────────────────────────────

function AssignPanel({
  incidentId,
  tenantId,
  label = "Assign",
  onDone,
}: {
  incidentId: string;
  tenantId: string;
  label?: string;
  onDone: () => void;
}) {
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();
  const { data: users } = useUsers();
  const [assigneeId, setAssigneeId] = useState("");

  // Engineers and admins can be assigned
  const assignable = (users ?? []).filter(
    (u) => u.role === "ENGINEER" || u.role === "ADMIN"
  );

  const assign = useMutation({
    mutationFn: () =>
      incidentsApi.patch(
        `/api/v1/incidents/${incidentId}/assign`,
        {
          assignedToUserId: assigneeId,
          assignedByUserId: userId,
          notes: null,
        },
        { params: { tenantId } }
      ),
    onSuccess: () => {
      toast.success("Incident assigned");
      queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      onDone();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to assign incident";
      toast.error(msg);
    },
  });

  return (
    <div className="flex items-end gap-2">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Assign to</Label>
        <Select value={assigneeId} onValueChange={setAssigneeId}>
          <SelectTrigger className="h-8 w-52 text-xs">
            <SelectValue placeholder="Select engineer…" />
          </SelectTrigger>
          <SelectContent>
            {assignable.map((u) => (
              <SelectItem key={u.userId} value={u.userId} className="text-xs">
                {u.email}{" "}
                <span className="text-muted-foreground">· {u.role}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        size="sm"
        className="h-8"
        disabled={!assigneeId || assign.isPending}
        onClick={() => assign.mutate()}
      >
        {assign.isPending ? "Assigning…" : label}
      </Button>
      <Button size="sm" variant="ghost" className="h-8" onClick={onDone}>
        Cancel
      </Button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function IncidentDetail({ incidentId }: { incidentId: string }) {
  const role = useAuthStore((s) => s.role);
  const userId = useAuthStore((s) => s.userId);
  const tenantId = useAuthStore((s) => s.tenantId);
  const queryClient = useQueryClient();
  const [showAssign, setShowAssign] = useState(false);
  const [isReassign, setIsReassign] = useState(false);

  const { data: incident, isLoading, isError } = useIncident(incidentId);
  const { data: logsPage } = useIncidentLogs(incidentId);

  // ── State machine rules ──────────────────────────────────────────────────

  const isAdmin = role === "ADMIN";
  const isEngineer = role === "ENGINEER";

  // Assign: NEW status, ADMIN only
  const showAssignBtn = incident?.status === "NEW" && isAdmin;

  // Reassign: ASSIGNED status, ADMIN only
  const showReassignBtn = incident?.status === "ASSIGNED" && isAdmin;

  // Acknowledge: ASSIGNED status, ADMIN or the assigned engineer
  const assignedTo = incident?.assignment?.assignedToUserId;
  const showAcknowledge =
    incident?.status === "ASSIGNED" &&
    (isAdmin || (isEngineer && assignedTo === userId));

  // Resolve: ACKNOWLEDGED status, ADMIN or the assigned engineer
  const showResolve =
    incident?.status === "ACKNOWLEDGED" &&
    (isAdmin || (isEngineer && assignedTo === userId));

  // ── Mutations ────────────────────────────────────────────────────────────

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
    queryClient.invalidateQueries({ queryKey: ["incidents"] });
  }

  const acknowledge = useMutation({
    mutationFn: () =>
      incidentsApi.patch(
        `/api/v1/incidents/${incidentId}/acknowledge`,
        { userId },
        { params: { tenantId } }
      ),
    onSuccess: () => {
      toast.success("Incident acknowledged");
      invalidate();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to acknowledge";
      toast.error(msg);
    },
  });

  const resolve = useMutation({
    mutationFn: () =>
      incidentsApi.patch(
        `/api/v1/incidents/${incidentId}/resolve`,
        { userId },
        { params: { tenantId } }
      ),
    onSuccess: () => {
      toast.success("Incident resolved");
      invalidate();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to resolve";
      toast.error(msg);
    },
  });

  // ── Loading / error states ────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
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
            {statusLabel[incident.status]}
          </Badge>
        </div>
      </div>

      {/* Action buttons */}
      {(showAssignBtn || showReassignBtn || showAcknowledge || showResolve) &&
        !showAssign && (
          <div className="flex flex-wrap gap-2">
            {showAssignBtn && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsReassign(false);
                  setShowAssign(true);
                }}
              >
                Assign
              </Button>
            )}
            {showReassignBtn && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsReassign(true);
                  setShowAssign(true);
                }}
              >
                Reassign
              </Button>
            )}
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
                className="border-status-resolved/40 text-status-resolved hover:bg-status-resolved/10"
                disabled={resolve.isPending}
                onClick={() => resolve.mutate()}
              >
                {resolve.isPending ? "Resolving…" : "Resolve"}
              </Button>
            )}
          </div>
        )}

      {/* Assign / Reassign panel (inline) */}
      {showAssign && (
        <AssignPanel
          incidentId={incidentId}
          tenantId={tenantId!}
          label={isReassign ? "Reassign" : "Assign"}
          onDone={() => setShowAssign(false)}
        />
      )}

      <AiSummary incident={incident} />

      <InvestigationPanel incidentId={incidentId} />

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
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
        {incident.assignment && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Assigned to</p>
            <p className="font-mono text-xs">
              {incident.assignment.assignedToUserId}
            </p>
          </div>
        )}
        {incident.resolvedAt && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Resolved</p>
            <p>{fmtDate(incident.resolvedAt)}</p>
          </div>
        )}
      </div>

      {/* Status history */}
      {incident.statusHistory && incident.statusHistory.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Status History</SectionLabel>
          <div className="flex flex-col">
            {incident.statusHistory.map((entry, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <div className="mt-1.5 flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-border ring-2 ring-background" />
                  {i < incident.statusHistory!.length - 1 && (
                    <div className="mt-1 h-4 w-px bg-border" />
                  )}
                </div>
                <div className="flex flex-1 items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className={STATUS_CLASS[entry.status]}
                  >
                    {statusLabel[entry.status]}
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
        <SectionLabel>Log Samples</SectionLabel>
        <div className="flex flex-col gap-1.5">
          {(logsPage?.content ?? []).length > 0
            ? logsPage!.content.map((log) => (
                <div
                  key={log.logId}
                  className="rounded-md border bg-muted/20 p-3 text-xs"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={`font-mono font-medium ${logLevelText[log.level] ?? "text-muted-foreground"}`}
                    >
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
