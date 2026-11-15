"use client";

import { toast } from "sonner";

import { GateCard } from "@/components/investigations/gate-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePrDecision } from "@/hooks/use-investigations";
import { prDecisionErrorMessage, type PendingPr } from "@/lib/pull-request";
import type { PrAction } from "@/types/investigation";

/** The fix is validated: open it as a draft pull request, or leave it as a diff. Shows exactly where and what. */
export function PrGate({
  investigationId,
  request,
  canAnswer,
}: {
  investigationId: string;
  request: PendingPr;
  /** Only ADMIN and ENGINEER can answer; others see the question but no buttons. */
  canAnswer: boolean;
}) {
  const decide = usePrDecision(investigationId);

  function answer(action: PrAction) {
    if (decide.isPending) return;
    decide.mutate(action, {
      onError: (error) => toast.error(prDecisionErrorMessage(error)),
    });
  }

  return (
    <GateCard
      label="Open a draft pull request"
      aside={
        request.confidenceBand && (
          <Badge variant="outline">{request.confidenceBand} confidence</Badge>
        )
      }
    >
      <p className="text-sm">
        Open a <strong>draft</strong> pull request on{" "}
        <span className="font-mono">{request.repository}</span>?
      </p>
      <dl className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-[auto_1fr] sm:gap-x-3">
        <dt>Branch</dt>
        <dd className="truncate font-mono text-foreground">{request.branch}</dd>
        <dt>Into</dt>
        <dd className="font-mono text-foreground">{request.defaultBranch}</dd>
      </dl>
      <ul className="flex flex-col gap-0.5 text-xs">
        {request.files.map((file) => (
          <li key={file.path} className="flex justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-mono">{file.path}</span>
              {!file.inRootCause && (
                <span
                  title="The root cause does not name this file"
                  className="shrink-0 rounded border border-severity-high/40 px-1 text-[10px] text-severity-high"
                >
                  extra
                </span>
              )}
            </span>
            <span className="shrink-0 font-mono">
              <span className="text-status-resolved">+{file.additions}</span>{" "}
              <span className="text-destructive">-{file.deletions}</span>
            </span>
          </li>
        ))}
      </ul>
      {request.files.some((f) => !f.inRootCause) && (
        <p className="text-xs text-severity-high">
          Files marked extra are not named in the root cause. Look at them
          separately before you approve.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        log0 never merges. It waits for the checks of the repository and tells
        you what they said.
      </p>

      {!canAnswer ? (
        <p className="text-xs text-muted-foreground">
          An engineer or admin needs to answer this.
        </p>
      ) : (
        <div className="flex flex-wrap justify-end gap-2 max-sm:[&>button]:flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => answer("decline")}
            disabled={decide.isPending}
          >
            Not now
          </Button>
          <Button
            size="sm"
            onClick={() => answer("approve")}
            disabled={decide.isPending}
          >
            {decide.isPending ? "Sending…" : "Open draft PR"}
          </Button>
        </div>
      )}
    </GateCard>
  );
}
