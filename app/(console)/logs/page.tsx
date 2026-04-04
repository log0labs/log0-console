"use client";

import { Fragment, useState, useMemo } from "react";
import { format, sub } from "date-fns";

import { useLogs } from "@/hooks/use-logs";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Level badge 

const LEVEL_CLASS: Record<string, string> = {
  ERROR: "bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400",
  WARN: "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400",
  INFO: "bg-blue-500/15 text-blue-500 border-blue-500/30 dark:text-blue-400",
  DEBUG: "bg-muted text-muted-foreground border-border",
};

function LevelBadge({ level }: { level: string }) {
  return (
    <Badge
      variant="outline"
      className={`font-mono text-xs ${LEVEL_CLASS[level] ?? LEVEL_CLASS.DEBUG}`}
    >
      {level}
    </Badge>
  );
}

// Time range presets

const TIME_RANGES = [
  { label: "Last 1 hour", value: "1h" },
  { label: "Last 6 hours", value: "6h" },
  { label: "Last 24 hours", value: "24h" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "All time", value: "all" },
] as const;

function rangeToFrom(value: string): string | undefined {
  if (value === "all") return undefined;
  const now = new Date();
  const map: Record<string, Date> = {
    "1h": sub(now, { hours: 1 }),
    "6h": sub(now, { hours: 6 }),
    "24h": sub(now, { hours: 24 }),
    "7d": sub(now, { days: 7 }),
    "30d": sub(now, { days: 30 }),
  };
  return map[value]?.toISOString();
}

// Page ───────

const PAGE_SIZE = 50;
const ALL = "ALL";

export default function LogsPage() {
  const [service, setService] = useState("");
  const [level, setLevel] = useState<string>(ALL);
  const [timeRange, setTimeRange] = useState("24h");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const from = useMemo(() => rangeToFrom(timeRange), [timeRange]);

  const filter = useMemo(
    () => ({
      service: service.trim() || undefined,
      level: level === ALL ? undefined : level,
      from,
      page,
      size: PAGE_SIZE,
    }),
    [service, level, from, page]
  );

  const { data, isLoading, isError } = useLogs(filter);

  function resetPage() {
    setPage(0);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading
            ? "Loading…"
            : data
              ? `${data.totalElements.toLocaleString()} log event${data.totalElements !== 1 ? "s" : ""}`
              : "Raw log events from ClickHouse"}
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
          value={level}
          onValueChange={(v) => {
            setLevel(v);
            resetPage();
          }}
        >
          <SelectTrigger className="h-9 w-32">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All levels</SelectItem>
            <SelectItem value="ERROR">ERROR</SelectItem>
            <SelectItem value="WARN">WARN</SelectItem>
            <SelectItem value="INFO">INFO</SelectItem>
            <SelectItem value="DEBUG">DEBUG</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={timeRange}
          onValueChange={(v) => {
            setTimeRange(v);
            resetPage();
          }}
        >
          <SelectTrigger className="h-9 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(service || level !== ALL || timeRange !== "24h") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => {
              setService("");
              setLevel(ALL);
              setTimeRange("24h");
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
              <TableHead className="w-44">Timestamp</TableHead>
              <TableHead className="w-20">Level</TableHead>
              <TableHead className="w-40">Service</TableHead>
              <TableHead className="w-28">Environment</TableHead>
              <TableHead>Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-12 text-center text-muted-foreground"
                >
                  Failed to load logs. Please try again.
                </TableCell>
              </TableRow>
            ) : !data?.content.length ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-12 text-center text-muted-foreground"
                >
                  No log events found.
                </TableCell>
              </TableRow>
            ) : (
              data.content.map((log) => (
                <Fragment key={log.eventId}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      setExpandedId(
                        expandedId === log.eventId ? null : log.eventId
                      )
                    }
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {format(new Date(log.timestamp), "MMM d HH:mm:ss.SSS")}
                    </TableCell>
                    <TableCell>
                      <LevelBadge level={log.level} />
                    </TableCell>
                    <TableCell className="text-sm">{log.serviceName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.environment}
                    </TableCell>
                    <TableCell className="max-w-0 truncate font-mono text-xs">
                      {log.message}
                    </TableCell>
                  </TableRow>

                  {expandedId === log.eventId && (
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableCell colSpan={5} className="p-4">
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">
                                Event ID:{" "}
                              </span>
                              <span className="font-mono">{log.eventId}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Fingerprint:{" "}
                              </span>
                              <span className="font-mono">
                                {log.fingerprint.slice(0, 16)}…
                              </span>
                            </div>
                            {log.traceId && (
                              <div>
                                <span className="text-muted-foreground">
                                  Trace ID:{" "}
                                </span>
                                <span className="font-mono">{log.traceId}</span>
                              </div>
                            )}
                          </div>
                          <pre className="max-h-48 overflow-y-auto rounded-md bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                            {log.message}
                          </pre>
                          {log.messageTemplate &&
                            log.messageTemplate !== log.message && (
                              <div>
                                <p className="mb-1 text-xs text-muted-foreground">
                                  Template
                                </p>
                                <pre className="font-mono text-xs text-muted-foreground">
                                  {log.messageTemplate}
                                </pre>
                              </div>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                aria-disabled={page === 0}
                className={
                  page === 0
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
            <PaginationItem className="flex items-center px-4 text-sm text-muted-foreground">
              Page {page + 1} of {data.totalPages}
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  setPage((p) => Math.min(data.totalPages - 1, p + 1))
                }
                aria-disabled={page === data.totalPages - 1}
                className={
                  page === data.totalPages - 1
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
