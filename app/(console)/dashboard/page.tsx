"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow, startOfDay, subDays } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import { useIncidents } from "@/hooks/use-incidents";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { IncidentStatus, Severity } from "@/types/incident";
import {
  severityFill as SEVERITY_FILL,
  statusFill as STATUS_FILL,
  severityBadge as SEVERITY_CLASS,
  statusBadge as STATUS_CLASS,
  chartAccent,
} from "@/lib/theme/tokens";

// ── Colors come from lib/theme/tokens.ts (central, theme-driven) ───────────────

const STATUS_LABEL: Record<IncidentStatus, string> = {
  NEW: "New",
  ASSIGNED: "Assigned",
  ACKNOWLEDGED: "Acknowledged",
  RESOLVED: "Resolved",
};

// ── Chart configs ─────────────────────────────────────────────────────────────

const countConfig = {
  count: { label: "Incidents", color: chartAccent },
} satisfies ChartConfig;

// ── Custom tooltip for Cell-colored bars ──────────────────────────────────────

function CellTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: { name: string; fill: string };
  }>;
}) {
  if (!active || !payload?.[0]) return null;
  const { value, payload: bar } = payload[0];
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      <div className="flex items-center gap-2 font-medium">
        <div
          className="h-2 w-2 rounded-full"
          style={{ background: bar.fill }}
        />
        {bar.name}
      </div>
      <p className="mt-0.5 text-muted-foreground">
        {value} incident{value !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  description,
  loading,
  accent,
}: {
  title: string;
  value: number;
  description?: string;
  loading: boolean;
  accent?: string;
}) {
  return (
    <Card>
      <CardHeader className="pt-5 pb-2">
        <CardDescription className="text-xs font-medium tracking-wider uppercase">
          {title}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-5">
        {loading ? (
          <Skeleton className="h-10 w-20" />
        ) : (
          <>
            <p
              className="text-4xl font-bold tabular-nums"
              style={accent && value > 0 ? { color: accent } : undefined}
            >
              {value.toLocaleString()}
            </p>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading } = useIncidents();

  // ── Derived stats ─────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    if (!data) return null;
    const incidents = data.content;

    const byStatus: Record<IncidentStatus, number> = {
      NEW: 0,
      ASSIGNED: 0,
      ACKNOWLEDGED: 0,
      RESOLVED: 0,
    };
    const bySeverity: Record<Severity, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };
    const serviceMap = new Map<string, number>();

    for (const inc of incidents) {
      byStatus[inc.status]++;
      bySeverity[inc.severity]++;
      serviceMap.set(
        inc.serviceName,
        (serviceMap.get(inc.serviceName) ?? 0) + 1
      );
    }

    const topServices = [...serviceMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([service, count]) => ({ service, count }));

    const recent = [...incidents]
      .sort(
        (a, b) =>
          new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
      )
      .slice(0, 8);

    return {
      total: incidents.length,
      open: byStatus.NEW + byStatus.ASSIGNED,
      byStatus,
      bySeverity,
      topServices,
      recent,
    };
  }, [data]);

  // ── Timeline: last 14 days, total incidents per day ───────────────────────

  const timelineData = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i);
      return {
        date: format(d, "MMM d"),
        _ts: startOfDay(d).getTime(),
        count: 0,
      };
    });
    if (data) {
      for (const inc of data.content) {
        const ts = startOfDay(new Date(inc.firstSeenAt)).getTime();
        const day = days.find((d) => d._ts === ts);
        if (day) day.count++;
      }
    }
    return days.map(({ _ts, ...rest }) => rest);
  }, [data]);

  // ── Severity bars ─────────────────────────────────────────────────────────

  const severityData = useMemo(
    () =>
      (["CRITICAL", "HIGH", "MEDIUM", "LOW"] as Severity[]).map((sev) => ({
        name: sev.charAt(0) + sev.slice(1).toLowerCase(),
        count: stats?.bySeverity[sev] ?? 0,
        fill: SEVERITY_FILL[sev],
      })),
    [stats]
  );

  // ── Status donut ──────────────────────────────────────────────────────────

  const donutData = useMemo(() => {
    if (!stats)
      return [{ name: "No data", value: 1, fill: "hsl(var(--muted))" }];
    const slices = (Object.keys(STATUS_FILL) as IncidentStatus[]).map((s) => ({
      name: STATUS_LABEL[s],
      value: stats.byStatus[s],
      fill: STATUS_FILL[s],
    }));
    const hasData = slices.some((s) => s.value > 0);
    return hasData
      ? slices
      : [{ name: "No data", value: 1, fill: "hsl(var(--muted))" }];
  }, [stats]);

  // ── Axis style ────────────────────────────────────────────────────────────
  // CSS variables (hsl(var(--x))) don't resolve inside SVG fill/stroke attrs.
  // Use hardcoded values that work on the dark background.

  const axisTick = { fontSize: 11, fill: "var(--muted-foreground)" };
  const gridStroke = "rgba(255,255,255,0.08)";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Incident overview across all services
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="Total" value={stats?.total ?? 0} loading={isLoading} />
        <StatCard
          title="Open"
          value={stats?.open ?? 0}
          description="New + Assigned"
          loading={isLoading}
          accent={STATUS_FILL.ASSIGNED}
        />
        <StatCard
          title="Acknowledged"
          value={stats?.byStatus.ACKNOWLEDGED ?? 0}
          loading={isLoading}
          accent={STATUS_FILL.ACKNOWLEDGED}
        />
        <StatCard
          title="Resolved"
          value={stats?.byStatus.RESOLVED ?? 0}
          loading={isLoading}
          accent={STATUS_FILL.RESOLVED}
        />
      </div>

      {/* Timeline + Status donut */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Timeline - 2/3 width */}
        <Card className="lg:col-span-2">
          <CardHeader className="pt-5 pb-2">
            <CardTitle className="text-sm font-medium">
              Incidents Over Time
            </CardTitle>
            <CardDescription>
              New incidents per day · last 14 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <ChartContainer config={countConfig} className="h-[220px] w-full">
                <BarChart data={timelineData} barCategoryGap="35%">
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    stroke={gridStroke}
                  />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={axisTick}
                    interval={1}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={axisTick}
                    allowDecimals={false}
                    width={24}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="count"
                    fill={chartAccent}
                    radius={[4, 4, 0, 0]}
                    minPointSize={2}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Status donut - 1/3 width */}
        <Card>
          <CardHeader className="pt-5 pb-2">
            <CardTitle className="text-sm font-medium">
              Status Distribution
            </CardTitle>
            <CardDescription>Current incident states</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pb-5">
            {isLoading ? (
              <Skeleton className="h-[180px] w-[180px] rounded-full" />
            ) : (
              <ChartContainer
                config={countConfig}
                className="h-[180px] w-[180px]"
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={80}
                    strokeWidth={2}
                    stroke="hsl(var(--background))"
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                style={{
                                  fontSize: "1.6rem",
                                  fontWeight: 700,
                                  fill: "var(--foreground)",
                                }}
                              >
                                {stats?.total ?? 0}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 20}
                                style={{
                                  fontSize: "0.7rem",
                                  fill: "var(--muted-foreground)",
                                }}
                              >
                                total
                              </tspan>
                            </text>
                          );
                        }
                      }}
                    />
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}

            {/* Legend */}
            {!isLoading && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {(Object.keys(STATUS_FILL) as IncidentStatus[]).map((s) => (
                  <div
                    key={s}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: STATUS_FILL[s] }}
                    />
                    <span>
                      {STATUS_LABEL[s]}:{" "}
                      <span className="font-medium text-foreground">
                        {stats?.byStatus[s] ?? 0}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Severity breakdown + Top services */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Severity bar chart */}
        <Card>
          <CardHeader className="pt-5 pb-2">
            <CardTitle className="text-sm font-medium">
              Severity Breakdown
            </CardTitle>
            <CardDescription>Incidents by severity level</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[180px] w-full" />
            ) : (
              <ChartContainer config={countConfig} className="h-[180px] w-full">
                <BarChart data={severityData} barCategoryGap="35%">
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    stroke={gridStroke}
                  />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={axisTick}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={axisTick}
                    allowDecimals={false}
                    width={24}
                  />
                  <ChartTooltip content={<CellTooltip />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} minPointSize={2}>
                    {severityData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Top services horizontal bar */}
        <Card>
          <CardHeader className="pt-5 pb-2">
            <CardTitle className="text-sm font-medium">Top Services</CardTitle>
            <CardDescription>Services ranked by incident count</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[180px] w-full" />
            ) : !stats?.topServices.length ? (
              <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
                No incidents yet
              </div>
            ) : (
              <ChartContainer config={countConfig} className="h-[180px] w-full">
                <BarChart
                  data={stats.topServices}
                  layout="vertical"
                  barCategoryGap="25%"
                  margin={{ left: 0, right: 8, top: 0, bottom: 0 }}
                >
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tick={axisTick}
                    allowDecimals={false}
                  />
                  <YAxis
                    dataKey="service"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    tick={axisTick}
                    width={116}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="count"
                    fill={chartAccent}
                    radius={[0, 4, 4, 0]}
                    minPointSize={3}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent incidents */}
      <Card>
        <CardHeader className="pt-5 pb-2">
          <CardTitle className="text-sm font-medium">
            Recent Incidents
          </CardTitle>
          <CardDescription>Latest activity across all services</CardDescription>
        </CardHeader>
        <CardContent className="p-0 pb-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28 pl-6">Severity</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead className="pr-6 text-right">Last seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell
                        key={j}
                        className={j === 0 ? "pl-6" : j === 4 ? "pr-6" : ""}
                      >
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !stats?.recent.length ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No incidents yet.
                  </TableCell>
                </TableRow>
              ) : (
                stats.recent.map((inc) => (
                  <TableRow
                    key={inc.incidentId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/incidents/${inc.incidentId}`)}
                  >
                    <TableCell className="pl-6">
                      <Badge
                        variant="outline"
                        className={`text-xs ${SEVERITY_CLASS[inc.severity]}`}
                      >
                        {inc.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${STATUS_CLASS[inc.status]}`}
                      >
                        {STATUS_LABEL[inc.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {inc.serviceName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {inc.environment}
                    </TableCell>
                    <TableCell className="pr-6 text-right text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(inc.lastSeenAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
