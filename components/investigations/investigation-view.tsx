"use client";

import { useMemo } from "react";

import { BulletBlock } from "@/components/investigations/bullet-block";
import { EvidenceList } from "@/components/investigations/evidence-list";
import { FeedbackBar } from "@/components/investigations/feedback-bar";
import { FixPanel } from "@/components/investigations/fix-panel";
import { GapsNotice } from "@/components/investigations/gaps-notice";
import { HypothesisList } from "@/components/investigations/hypothesis-list";
import { RunMeta } from "@/components/investigations/run-meta";
import { StageRail } from "@/components/investigations/stage-rail";
import { Timeline } from "@/components/investigations/timeline";
import { Verdict } from "@/components/investigations/verdict";
import { SectionLabel } from "@/components/ui/section-label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ConnectionState } from "@/lib/event-stream";
import { deriveStages } from "@/lib/stages";
import {
  deriveEvidence,
  deriveGaps,
  deriveHypotheses,
  deriveRedaction,
} from "@/lib/timeline";
import {
  ACTIVE_STATUSES,
  type Investigation,
  type StreamEvent,
} from "@/types/investigation";

/**
 * One investigation, as a screen: progress rail on top, then the answer split into Cause, Evidence, Fix and
 * Steps. Presentational: it gets the run and its events, and any review gate to show, from its parent.
 */
export function InvestigationView({
  run,
  events,
  state,
  gate,
}: {
  run: Investigation;
  events: StreamEvent[];
  state: ConnectionState;
  /** The review gate, when the run is waiting for an answer. */
  gate?: React.ReactNode;
}) {
  const active = ACTIVE_STATUSES.includes(run.status);
  const stages = useMemo(() => deriveStages(events), [events]);
  const evidence = useMemo(() => deriveEvidence(events), [events]);
  const hypotheses = useMemo(() => deriveHypotheses(events), [events]);
  const gaps = useMemo(() => deriveGaps(events), [events]);
  const redaction = useMemo(() => deriveRedaction(events), [events]);
  const { rootCause } = run;
  const done = run.status === "COMPLETED" && !!rootCause;

  const steps = <Timeline events={events} state={state} working={active} />;

  return (
    <div className="flex flex-col gap-4">
      <StageRail stages={stages} />
      {gate}

      {run.status === "FAILED" && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          {run.error ?? "The investigation failed."}
        </p>
      )}
      {run.status === "CANCELLED" && (
        <p className="rounded-lg border border-dashed px-3 py-2.5 text-sm text-muted-foreground">
          Stopped before finishing.
        </p>
      )}
      {run.status === "COMPLETED" && !rootCause && (
        <p className="rounded-lg border border-dashed px-3 py-2.5 text-sm text-muted-foreground">
          It finished without a root cause. See the steps for what it tried.
        </p>
      )}

      {done ? (
        <Tabs defaultValue="cause">
          <TabsList>
            <TabsTrigger value="cause">Cause</TabsTrigger>
            <TabsTrigger value="evidence">
              Evidence
              <span className="font-mono text-xs text-muted-foreground">
                {evidence.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="fix">
              Fix
              {run.diff && (
                <span
                  aria-label="has a diff"
                  className="size-1.5 rounded-full bg-primary"
                />
              )}
            </TabsTrigger>
            <TabsTrigger value="steps">Steps</TabsTrigger>
          </TabsList>

          <TabsContent value="cause">
            <GapsNotice gaps={gaps} />
            <Verdict rootCause={rootCause} band={run.confidenceBand} />
            <BulletBlock
              title="Contributing"
              items={rootCause.contributingFactors}
            />
            <BulletBlock
              title="Still unknown"
              items={rootCause.unresolvedQuestions}
            />
            {hypotheses.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <SectionLabel>Considered</SectionLabel>
                <HypothesisList items={hypotheses} />
              </div>
            )}
            <FeedbackBar investigationId={run.id} />
          </TabsContent>

          <TabsContent value="evidence">
            <EvidenceList items={evidence} citedIds={rootCause.evidenceIds} />
            {redaction.count > 0 && (
              <p className="text-xs text-muted-foreground">
                {redaction.count} sensitive value
                {redaction.count === 1 ? "" : "s"} hidden before analysis
                {redaction.kinds.length > 0 &&
                  ` (${redaction.kinds.join(", ")})`}
                .
              </p>
            )}
          </TabsContent>

          <TabsContent value="fix">
            <FixPanel run={run} />
          </TabsContent>

          <TabsContent value="steps">{steps}</TabsContent>
        </Tabs>
      ) : (
        <>
          {!active && <GapsNotice gaps={gaps} />}
          {steps}
        </>
      )}

      <RunMeta run={run} />
    </div>
  );
}
