"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

import { useIncidentPage, useIncidentStats } from "@/hooks/use-incidents";
import { useLatestInvestigations } from "@/hooks/use-investigations";
import type { LatestInvestigation } from "@/types/investigation";
import type {
  IncidentFilters,
  IncidentStatus,
  Severity,
} from "@/types/incident";
import {
  investigationStatusBadge,
  investigationStatusLabel,
  severityBadge,
  statusBadge,
} from "@/lib/theme/tokens";
import { deployMark } from "@/lib/remediation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const SEVERITY_CONFIG: Record<Severity, { label: string; className: string }> =
  {
    CRITICAL: { label: "Critical", className: severityBadge.CRITICAL },
    HIGH: { label: "High", className: severityBadge.HIGH },
    MEDIUM: { label: "Medium", className: severityBadge.MEDIUM },
    LOW: { label: "Low", className: severityBadge.LOW },
  };

const STATUS_CONFIG: Record<
  IncidentStatus,
  { label: string; className: string }
> = {
  NEW: { label: "New", className: statusBadge.NEW },
  ASSIGNED: { label: "Assigned", className: statusBadge.ASSIGNED },
  ACKNOWLEDGED: { label: "Acknowledged", className: statusBadge.ACKNOWLEDGED },
  RESOLVED: { label: "Resolved", className: statusBadge.RESOLVED },
};

function SeverityBadge({ severity }: { severity: Severity }) {
  const { label, className } = SEVERITY_CONFIG[severity];
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: IncidentStatus }) {
  const { label, className } = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

function timeAgo(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

const ALL = "ALL";

const MARK_TONE = {
  good: "text-status-resolved",
  bad: "text-destructive",
  working: "text-primary",
  ask: "text-severity-high",
  neutral: "text-muted-foreground",
} as const;

/** What the AI did about an incident, in one badge: not investigated, running, needs you, done (with a fix), failed. */
function AiCell({ run }: { run: LatestInvestigation | undefined }) {
  if (!run) return <span className="text-xs text-muted-foreground">-</span>;
  const mark = deployMark(run.deployStatus);
  return (
    <span className="flex items-center gap-1.5">
      <Badge variant="outline" className={investigationStatusBadge[run.status]}>
        {investigationStatusLabel[run.status]}
      </Badge>
      {run.status === "COMPLETED" && (run.hasPullRequest || run.hasDiff) && (
        <span
          className="font-mono text-[11px] text-primary"
          title={
            run.hasPullRequest
              ? "A draft pull request was opened"
              : "A validated fix is ready"
          }
        >
          {run.hasPullRequest ? "+PR" : "+fix"}
        </span>
      )}
      {mark && (
        <span className={cn("font-mono text-[11px]", MARK_TONE[mark.tone])} title="The latest deploy of the fix">
          {mark.label}
        </span>
      )}
    </span>
  );
}

export function IncidentsList({ selectedId }: { selectedId?: string | null }) {
  const router = useRouter();
  const [service, setService] = useState("");
  const [severity, setSeverity] = useState<Severity | typeof ALL>(ALL);
  const [status, setStatus] = useState<IncidentStatus | typeof ALL>(ALL);
  const [environment, setEnvironment] = useState<string | typeof ALL>(ALL);
  const [page, setPage] = useState(0);

  // the service box filters as you type, but asks the server only after a short pause
  const [serviceName, setServiceName] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setServiceName(service.trim()), 300);
    return () => clearTimeout(timer);
  }, [service]);

  const filters = useMemo<IncidentFilters>(
    () => ({
      ...(severity !== ALL && { severity }),
      ...(status !== ALL && { status }),
      ...(environment !== ALL && { environment }),
      ...(serviceName && { serviceName }),
    }),
    [severity, status, environment, serviceName]
  );
  const { data, isLoading, isError } = useIncidentPage(filters, page);
  const { data: stats } = useIncidentStats();
  const { data: latest } = useLatestInvestigations(
    (data?.content ?? []).map((i) => i.incidentId)
  );

  const environments = stats?.environments ?? [];
  const pageItems = data?.content ?? [];
  const totalPages = Math.max(1, data?.totalPages ?? 1);
  const safePage = Math.min(page, totalPages - 1);
  const filtering = Object.keys(filters).length > 0;

  function resetPage() {
    setPage(0);
  }

  function handleRowClick(incidentId: string) {
    if (selectedId === incidentId) {
      // Clicking the already-open row closes the drawer
      router.push("/incidents");
    } else {
      router.push(`/incidents/${incidentId}`);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Incidents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading
            ? "Loading…"
            : `${data?.totalElements ?? 0} incident${data?.totalElements === 1 ? "" : "s"}${
                filtering && stats ? ` (of ${stats.total})` : ""
              }`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Filter by service…"
          value={service}
          onChange={(e) => {
            setService(e.target.value);
            resetPage();
          }}
          className="h-9 w-48"
        />

        <Select
          value={severity}
          onValueChange={(v) => {
            setSeverity(v as Severity | typeof ALL);
            resetPage();
          }}
        >
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All severities</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as IncidentStatus | typeof ALL);
            resetPage();
          }}
        >
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="ASSIGNED">Assigned</SelectItem>
            <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={environment}
          onValueChange={(v) => {
            setEnvironment(v);
            resetPage();
          }}
        >
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All environments</SelectItem>
            {environments.map((env) => (
              <SelectItem key={env} value={env}>
                {env}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(service ||
          severity !== ALL ||
          status !== ALL ||
          environment !== ALL) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => {
              setService("");
              setSeverity(ALL);
              setStatus(ALL);
              setEnvironment(ALL);
              resetPage();
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Severity</TableHead>
              <TableHead className="w-36">Status</TableHead>
              <TableHead>Service</TableHead>
              <TableHead className="max-md:hidden">Environment</TableHead>
              <TableHead className="w-28 text-right max-md:hidden">
                Occurrences
              </TableHead>
              <TableHead className="w-36 max-sm:hidden">Last seen</TableHead>
              <TableHead className="w-36 max-lg:hidden">First seen</TableHead>
              <TableHead className="w-32">AI</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell
                      key={j}
                      className={
                        j === 3 || j === 4
                          ? "max-md:hidden"
                          : j === 5
                            ? "max-sm:hidden"
                            : j === 6
                              ? "max-lg:hidden"
                              : undefined
                      }
                    >
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-12 text-center text-muted-foreground"
                >
                  Failed to load incidents. Please try again.
                </TableCell>
              </TableRow>
            ) : pageItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-12 text-center text-muted-foreground"
                >
                  No incidents found.
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((incident) => (
                <TableRow
                  key={incident.incidentId}
                  className={`cursor-pointer hover:bg-muted/50 ${
                    selectedId === incident.incidentId ? "bg-muted/40" : ""
                  }`}
                  onClick={() => handleRowClick(incident.incidentId)}
                >
                  <TableCell>
                    <SeverityBadge severity={incident.severity} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={incident.status} />
                  </TableCell>
                  <TableCell className="font-medium">
                    {incident.serviceName}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-md:hidden">
                    {incident.environment}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm max-md:hidden">
                    {incident.occurrenceCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-sm:hidden">
                    {timeAgo(incident.lastSeenAt)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-lg:hidden">
                    {timeAgo(incident.firstSeenAt)}
                  </TableCell>
                  <TableCell>
                    <AiCell run={latest?.[incident.incidentId]} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                aria-disabled={safePage === 0}
                className={
                  safePage === 0
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
            <PaginationItem className="flex items-center px-4 text-sm text-muted-foreground">
              Page {safePage + 1} of {totalPages}
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                aria-disabled={safePage === totalPages - 1}
                className={
                  safePage === totalPages - 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
