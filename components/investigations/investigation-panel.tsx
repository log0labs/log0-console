"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiMagicIcon } from "@hugeicons/core-free-icons";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { Skeleton } from "@/components/ui/skeleton";
import { InvestigationView } from "@/components/investigations/investigation-view";
import { ReviewGate } from "@/components/investigations/review-gate";
import { StartForm } from "@/components/investigations/start-form";
import { useInvestigationEvents } from "@/hooks/use-investigation-events";
import {
  useCancelInvestigation,
  useInvestigations,
} from "@/hooks/use-investigations";
import { pendingReview } from "@/lib/review";
import {
  investigationStatusBadge,
  investigationStatusLabel,
} from "@/lib/theme/tokens";
import { useAuthStore } from "@/store/auth";
import { ACTIVE_STATUSES } from "@/types/investigation";

/** AI investigation of one incident: start one, follow it live, read the answer, pick an earlier run. */
export function InvestigationPanel({ incidentId }: { incidentId: string }) {
  const role = useAuthStore((s) => s.role);
  const canStart = role === "ADMIN" || role === "ENGINEER";
  const { data, isLoading, isError, refetch } = useInvestigations(incidentId);
  const [starting, setStarting] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);

  const run = data?.find((r) => r.id === pickedId) ?? data?.[0];
  const latest = data?.[0];
  const active = !!latest && ACTIVE_STATUSES.includes(latest.status);
  const { events, state } = useInvestigationEvents(run?.id ?? null);
  const cancel = useCancelInvestigation(run?.id ?? "");
  const review =
    run?.status === "AWAITING_REVIEW" ? pendingReview(events) : null;

  return (
    <section className="flex flex-col gap-3">
      <SectionLabel
        aside={
          canStart &&
          !starting &&
          !active &&
          data && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => setStarting(true)}
            >
              <HugeiconsIcon icon={AiMagicIcon} size={13} />
              {latest ? "Investigate again" : "Investigate"}
            </Button>
          )
        }
      >
        Investigation
      </SectionLabel>

      {isLoading && <Skeleton className="h-24 w-full" />}

      {isError && (
        <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
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
          onStarted={() => {
            setStarting(false);
            setPickedId(null);
          }}
          onCancel={() => setStarting(false)}
        />
      )}

      {data && !latest && !starting && (
        <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed p-4">
          <p className="text-sm text-muted-foreground">
            {canStart
              ? "Find the root cause across logs, history, code and runbooks."
              : "Engineers and admins can start an investigation."}
          </p>
          {canStart && (
            <Button size="sm" onClick={() => setStarting(true)}>
              <HugeiconsIcon icon={AiMagicIcon} size={14} />
              Investigate
            </Button>
          )}
        </div>
      )}

      {run && (
        <div className="flex flex-col gap-4 rounded-xl border p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Badge
                variant="outline"
                className={investigationStatusBadge[run.status]}
              >
                {investigationStatusLabel[run.status]}
              </Badge>
              <span className="truncate text-sm text-muted-foreground">
                {run.question ?? "Find the root cause"}
              </span>
            </div>
            {canStart && ACTIVE_STATUSES.includes(run.status) && (
              <Button
                variant="ghost"
                size="xs"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate()}
              >
                Stop
              </Button>
            )}
          </div>

          {data && data.length > 1 && (
            <div className="-mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
              {data.map((r, i) => (
                <Button
                  key={r.id}
                  variant="chip"
                  size="xs"
                  aria-pressed={r.id === run.id}
                  onClick={() => setPickedId(r.id)}
                >
                  {i === 0
                    ? "Latest"
                    : formatDistanceToNow(new Date(r.createdAt), {
                        addSuffix: true,
                      })}
                </Button>
              ))}
            </div>
          )}

          <InvestigationView
            run={run}
            events={events}
            state={state}
            gate={
              review && (
                <ReviewGate
                  key={review.seq}
                  investigationId={run.id}
                  review={review}
                  canAnswer={canStart}
                />
              )
            }
          />
        </div>
      )}
    </section>
  );
}
