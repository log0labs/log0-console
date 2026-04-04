"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { useIncidents } from "@/hooks/use-incidents";
import type { Incident, IncidentStatus, Severity } from "@/types/incident";
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

// Badge config 

const SEVERITY_CONFIG: Record<Severity, { label: string; className: string }> =
  {
    CRITICAL: {
      label: "Critical",
      className:
        "bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400",
    },
    HIGH: {
      label: "High",
      className:
        "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400",
    },
    MEDIUM: {
      label: "Medium",
      className:
        "bg-yellow-500/15 text-yellow-600 border-yellow-500/30 dark:text-yellow-400",
    },
    LOW: {
      label: "Low",
      className:
        "bg-blue-500/15 text-blue-500 border-blue-500/30 dark:text-blue-400",
    },
  };

const STATUS_CONFIG: Record<
  IncidentStatus,
  { label: string; className: string }
> = {
  NEW: {
    label: "New",
    className: "bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400",
  },
  ASSIGNED: {
    label: "Assigned",
    className:
      "bg-yellow-500/15 text-yellow-600 border-yellow-500/30 dark:text-yellow-400",
  },
  ACKNOWLEDGED: {
    label: "Acknowledged",
    className:
      "bg-blue-500/15 text-blue-500 border-blue-500/30 dark:text-blue-400",
  },
  RESOLVED: {
    label: "Resolved",
    className:
      "bg-green-500/15 text-green-600 border-green-500/30 dark:text-green-400",
  },
};

// Helpers ─────

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

// Constants ───

const PAGE_SIZE = 20;

const ALL = "ALL";

// Page ────────

export default function IncidentsPage() {
  const { data, isLoading, isError } = useIncidents();

  const [service, setService] = useState("");
  const [severity, setSeverity] = useState<Severity | typeof ALL>(ALL);
  const [status, setStatus] = useState<IncidentStatus | typeof ALL>(ALL);
  const [environment, setEnvironment] = useState<string | typeof ALL>(ALL);
  const [page, setPage] = useState(0);

  // Unique environments from the fetched data for the filter dropdown
  const environments = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.content.map((i) => i.environment))].sort();
  }, [data]);

  // Client-side filtering
  const filtered = useMemo<Incident[]>(() => {
    if (!data) return [];
    return data.content.filter((i) => {
      if (severity !== ALL && i.severity !== severity) return false;
      if (status !== ALL && i.status !== status) return false;
      if (environment !== ALL && i.environment !== environment) return false;
      if (
        service &&
        !i.serviceName.toLowerCase().includes(service.toLowerCase())
      )
        return false;
      return true;
    });
  }, [data, severity, status, environment, service]);

  // Client-side pagination over filtered results
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE
  );

  function resetPage() {
    setPage(0);
  }

  // Render ────

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Incidents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading
            ? "Loading…"
            : `${filtered.length} incident${filtered.length !== 1 ? "s" : ""}${filtered.length !== data?.content.length ? ` (filtered from ${data?.content.length})` : ""}`}
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
              <TableHead>Environment</TableHead>
              <TableHead className="w-28 text-right">Occurrences</TableHead>
              <TableHead className="w-36">Last seen</TableHead>
              <TableHead className="w-36">First seen</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-muted-foreground"
                >
                  Failed to load incidents. Please try again.
                </TableCell>
              </TableRow>
            ) : pageItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-muted-foreground"
                >
                  No incidents found.
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((incident) => (
                <TableRow
                  key={incident.incidentId}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell>
                    <SeverityBadge severity={incident.severity} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={incident.status} />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/incidents/${incident.incidentId}`}
                      className="font-medium hover:underline"
                    >
                      {incident.serviceName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {incident.environment}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {incident.occurrenceCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {timeAgo(incident.lastSeenAt)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {timeAgo(incident.firstSeenAt)}
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
