"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { DiffViewer } from "@/components/investigations/diff-viewer";
import { deriveEvidence, deriveHypotheses } from "@/lib/timeline";
import type { Investigation, StreamEvent } from "@/types/investigation";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
        {title}
      </p>
      {children}
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function money(value: number | string | null): string | null {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? `$${n.toFixed(n < 0.01 ? 4 : 2)}` : null;
}

/** The finished investigation: root cause, the evidence behind it, what to do, and the diff. */
export function ResultView({
  investigation,
  events,
}: {
  investigation: Investigation;
  events: StreamEvent[];
}) {
  const { rootCause, recommendation, diff, confidenceBand } = investigation;
  const evidence = useMemo(() => deriveEvidence(events), [events]);
  const hypotheses = useMemo(() => deriveHypotheses(events), [events]);

  if (!rootCause) return null;

  const byId = new Map(evidence.map((e) => [e.id, e]));
  const cited = rootCause.evidenceIds.map((id) => ({
    id,
    item: byId.get(id) ?? null,
  }));
  const refuted = hypotheses.filter((h) => h.status === "refuted");
  const cost = money(investigation.costUsd);

  return (
    <div className="flex flex-col gap-4">
      <Section title="Root cause">
        <div className="flex flex-col gap-2 rounded-lg border bg-background p-3">
          <div className="flex items-center gap-2">
            {confidenceBand && (
              <Badge variant="outline">{confidenceBand} confidence</Badge>
            )}
          </div>
          <p className="text-sm leading-relaxed">{rootCause.statement}</p>
          {rootCause.affectedLocations.length > 0 && (
            <ul className="space-y-0.5 font-mono text-xs text-muted-foreground">
              {rootCause.affectedLocations.map((loc, i) => (
                <li key={i}>
                  {loc.filePath}
                  {loc.line ? `:${loc.line}` : ""}
                  {loc.function ? ` (${loc.function})` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
        {rootCause.contributingFactors.length > 0 && (
          <>
            <p className="mt-1 text-xs text-muted-foreground">
              Contributing factors
            </p>
            <Bullets items={rootCause.contributingFactors} />
          </>
        )}
        {rootCause.unresolvedQuestions.length > 0 && (
          <>
            <p className="mt-1 text-xs text-muted-foreground">Still unknown</p>
            <Bullets items={rootCause.unresolvedQuestions} />
          </>
        )}
      </Section>

      {cited.length > 0 && (
        <Section title={`Evidence (${cited.length})`}>
          <ul className="flex flex-col gap-1.5">
            {cited.map(({ id, item }) => (
              <li key={id} className="flex items-start gap-2 text-sm">
                <Badge variant="outline" className="shrink-0">
                  {item?.kind ?? "evidence"}
                </Badge>
                <span className="min-w-0 break-words">
                  {item?.summary || (
                    <span className="font-mono text-xs text-muted-foreground">
                      {id}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {refuted.length > 0 && (
        <Section title="Ruled out">
          <Bullets items={refuted.map((h) => h.statement)} />
        </Section>
      )}

      {recommendation && (
        <Section title="Recommendation">
          <p className="text-sm font-medium">{recommendation.summary}</p>
          {recommendation.rationale && (
            <p className="text-sm text-muted-foreground">
              {recommendation.rationale}
            </p>
          )}
          {recommendation.risks.length > 0 && (
            <>
              <p className="mt-1 text-xs text-muted-foreground">Risks</p>
              <Bullets items={recommendation.risks} />
            </>
          )}
          {recommendation.testsRequired.length > 0 && (
            <>
              <p className="mt-1 text-xs text-muted-foreground">
                Tests to add or run
              </p>
              <Bullets items={recommendation.testsRequired} />
            </>
          )}
          {recommendation.verificationSteps.length > 0 && (
            <>
              <p className="mt-1 text-xs text-muted-foreground">
                How to verify
              </p>
              <Bullets items={recommendation.verificationSteps} />
            </>
          )}
        </Section>
      )}

      {diff ? (
        <Section title="Proposed change">
          <DiffViewer diff={diff} investigationId={investigation.id} />
        </Section>
      ) : (
        recommendation &&
        recommendation.changes.length > 0 && (
          <p className="text-xs text-muted-foreground">
            A code change was proposed but did not pass validation, so no diff
            is shown.
          </p>
        )
      )}

      <p className="text-xs text-muted-foreground">
        {[
          investigation.model,
          investigation.toolCallCount != null
            ? `${investigation.toolCallCount} tool calls`
            : null,
          cost,
        ]
          .filter(Boolean)
          .join(", ")}
      </p>
    </div>
  );
}
