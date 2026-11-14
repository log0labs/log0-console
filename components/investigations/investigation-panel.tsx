"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StartForm } from "@/components/investigations/start-form";
import { useInvestigations } from "@/hooks/use-investigations";
import { useAuthStore } from "@/store/auth";
import { ACTIVE_STATUSES } from "@/types/investigation";

/** AI investigation of one incident: start one, follow it, read the result. */
export function InvestigationPanel({ incidentId }: { incidentId: string }) {
  const role = useAuthStore((s) => s.role);
  const canStart = role === "ADMIN" || role === "ENGINEER";
  const { data, isLoading, isError, refetch } = useInvestigations(incidentId);
  const [starting, setStarting] = useState(false);

  const latest = data?.[0];
  const active = !!latest && ACTIVE_STATUSES.includes(latest.status);

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Investigation
        </p>
        {canStart && !starting && !active && data && (
          <Button variant="outline" size="sm" onClick={() => setStarting(true)}>
            {latest ? "Investigate again" : "Investigate"}
          </Button>
        )}
      </div>

      {isLoading && <Skeleton className="h-20 w-full" />}

      {isError && (
        <div className="flex items-center justify-between rounded-lg border p-4 text-sm">
          <span className="text-muted-foreground">
            Could not load investigations.
          </span>
          <Button variant="ghost" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      )}

      {starting && (
        <StartForm
          incidentId={incidentId}
          onStarted={() => setStarting(false)}
          onCancel={() => setStarting(false)}
        />
      )}

      {data && !latest && !starting && (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          {canStart
            ? "No investigation yet. Start one to look for the root cause in logs, history and code."
            : "No investigation yet. Engineers and admins can start one."}
        </div>
      )}

      {latest && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-4 text-sm">
          <Badge variant="outline">{latest.status.replace("_", " ")}</Badge>
          <span className="text-muted-foreground">
            {latest.question ?? "Find the root cause"}
          </span>
        </div>
      )}
    </section>
  );
}
