"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { GateCard } from "@/components/investigations/gate-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import {
  useRemediationDecision,
  useRemediations,
  useRemediationStep,
} from "@/hooks/use-remediations";
import {
  approverFor,
  canAnswer,
  compare,
  countdown,
  failureReason,
  isSafeRunUrl,
  remediationErrorMessage,
  shortSha,
  statusLabel,
  type Role,
  type Tone,
} from "@/lib/remediation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import type { DecisionAction, Deployment, Remediation } from "@/types/remediation";

const TONE: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  working: "bg-primary/10 text-primary border-primary/30",
  good: "bg-status-resolved/15 text-status-resolved border-status-resolved/30",
  bad: "bg-destructive/10 text-destructive border-destructive/30",
  ask: "bg-severity-high/15 text-severity-high border-severity-high/30",
};

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

/** The deploys a merged pull request offered, one card per environment. Renders nothing when there are none. */
export function RemediationPanel({
  investigationId,
}: {
  investigationId: string;
}) {
  const { data } = useRemediations(investigationId);
  const role = useAuthStore((s) => s.role) as Role;
  if (!data || data.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <SectionLabel>Deploy</SectionLabel>
      {data.map((remediation) => (
        <RemediationCard
          key={remediation.id}
          remediation={remediation}
          investigationId={investigationId}
          role={role}
        />
      ))}
    </div>
  );
}

function Facts({ remediation }: { remediation: Remediation }) {
  return (
    <dl className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-[auto_1fr] sm:gap-x-3">
      <dt>Commit</dt>
      <dd className="font-mono text-foreground">{shortSha(remediation.mergeSha)}</dd>
      <dt>Back to</dt>
      <dd className="font-mono text-foreground">
        {remediation.rollbackTarget
          ? shortSha(remediation.rollbackTarget)
          : "unknown: a rollback will not be offered"}
      </dd>
    </dl>
  );
}

function RunLink({ deployment }: { deployment: Deployment | null }) {
  if (!deployment) return null;
  const label = deployment.kind === "rollback" ? "Rollback run" : "Pipeline run";
  return (
    <p className="text-xs text-muted-foreground">
      {isSafeRunUrl(deployment.runUrl) ? (
        <a
          href={deployment.runUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="text-primary underline-offset-4 hover:underline"
        >
          {label}
        </a>
      ) : (
        label
      )}{" "}
      is {deployment.status}.
    </p>
  );
}

function Bars({ remediation }: { remediation: Remediation }) {
  const bars = compare(remediation);
  if (!bars) return null;
  return (
    <div className="flex flex-col gap-1" aria-label="Errors per minute, before and now">
      {(
        [
          ["Before", bars.before, bars.beforeWidth, "bg-muted-foreground/50"],
          ["Now", bars.after, bars.afterWidth, bars.after > bars.before ? "bg-destructive" : "bg-status-resolved"],
        ] as const
      ).map(([label, value, width, color]) => (
        <div key={label} className="flex items-center gap-2 text-xs">
          <span className="w-12 text-muted-foreground">{label}</span>
          <div className="h-2 flex-1 rounded-full bg-muted">
            <div className={cn("h-2 rounded-full", color)} style={{ width: `${width}%` }} />
          </div>
          <span className="w-20 shrink-0 text-right font-mono">{value.toFixed(1)}/min</span>
        </div>
      ))}
    </div>
  );
}

function Reasons({ remediation }: { remediation: Remediation }) {
  const reasons = remediation.verification?.numbers.reasons ?? [];
  if (reasons.length === 0) return null;
  return (
    <ul className="flex list-disc flex-col gap-0.5 pl-4 text-xs text-muted-foreground">
      {reasons.map((reason) => (
        <li key={reason}>{reason}</li>
      ))}
    </ul>
  );
}

function RemediationCard({
  remediation,
  investigationId,
  role,
}: {
  remediation: Remediation;
  investigationId: string;
  role: Role;
}) {
  const step = useRemediationStep(investigationId);
  const decide = useRemediationDecision(investigationId);
  const timer = remediation.wakeAt !== null;
  const now = useNow(timer);
  const status = statusLabel(remediation.status);
  const mayAct = canAnswer(role, approverFor(remediation.environment));
  const mayStart = role === "ADMIN" || role === "ENGINEER";
  const busy = step.isPending || decide.isPending;
  const reason = failureReason(remediation);

  const run = (id: string, action: "start" | "deploy/approve" | "deploy/decline") =>
    step.mutate({ id, step: action }, { onError: (e) => toast.error(remediationErrorMessage(e)) });
  const choose = (action: DecisionAction) =>
    decide.mutate(
      { id: remediation.id, action },
      { onError: (e) => toast.error(remediationErrorMessage(e)) }
    );

  const header = (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-medium">
        <span className="font-mono">{remediation.environment}</span>
      </p>
      <Badge variant="outline" className={TONE[status.tone]}>
        {status.label}
      </Badge>
    </div>
  );

  if (remediation.status === "AWAITING_DEPLOY_APPROVAL") {
    return (
      <GateCard label={`Deploy to ${remediation.environment}`} title="Your call">
        {header}
        <p className="text-sm">
          Ask your pipeline to deploy this commit to{" "}
          <strong>{remediation.environment}</strong>?
        </p>
        <Facts remediation={remediation} />
        <p className="text-xs text-muted-foreground">
          log0 starts your own deploy workflow and holds no cloud credentials.
          It then watches the logs and tells you whether the error went away.
        </p>
        {mayAct ? (
          <div className="flex flex-wrap justify-end gap-2 max-sm:[&>button]:flex-1">
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(remediation.id, "deploy/decline")}>
              Not now
            </Button>
            <Button size="sm" disabled={busy} onClick={() => run(remediation.id, "deploy/approve")}>
              {busy ? "Sending…" : "Deploy"}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {approverFor(remediation.environment) === "ADMIN" ? "An admin" : "An engineer or admin"} needs to answer this.
          </p>
        )}
      </GateCard>
    );
  }

  if (remediation.status === "AWAITING_DECISION") {
    const verdict = remediation.verification?.verdict ?? "inconclusive";
    return (
      <GateCard
        label={`Decide about ${remediation.environment}`}
        title={verdict === "degraded" ? "The deploy looks worse" : "The deploy is unclear"}
      >
        {header}
        <Bars remediation={remediation} />
        <Reasons remediation={remediation} />
        <Facts remediation={remediation} />
        {mayAct ? (
          <div className="flex flex-wrap justify-end gap-2 max-sm:[&>button]:flex-1">
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => choose("keep")}>
              Keep it
            </Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => choose("extend")}>
              Watch longer
            </Button>
            {remediation.rollbackTarget && (
              <Button variant="destructive" size="sm" disabled={busy} onClick={() => choose("rollback")}>
                Roll back to {shortSha(remediation.rollbackTarget)}
              </Button>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {approverFor(remediation.environment) === "ADMIN" ? "An admin" : "An engineer or admin"} needs to decide.
          </p>
        )}
      </GateCard>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border p-3">
      {header}
      {remediation.status === "OFFERED" && (
        <>
          <p className="text-sm text-muted-foreground">
            The pull request was merged. Deploying it is a separate choice.
          </p>
          {reason && <p className="text-xs text-severity-high">Not started: {reason}</p>}
          {mayStart && (
            <div className="flex justify-end">
              <Button size="sm" disabled={busy} onClick={() => run(remediation.id, "start")}>
                {busy ? "Starting…" : "Review and deploy"}
              </Button>
            </div>
          )}
        </>
      )}
      {["PREFLIGHT", "DEPLOYING", "VERIFYING", "ROLLING_BACK"].includes(remediation.status) && (
        <>
          <RunLink deployment={remediation.rollback ?? remediation.deployment} />
          {remediation.status === "VERIFYING" && timer && (
            <p className="text-xs text-muted-foreground">
              Next look at the logs in {countdown(remediation.wakeAt, now)}.
            </p>
          )}
          <Bars remediation={remediation} />
        </>
      )}
      {["VERIFIED", "ROLLED_BACK", "FAILED"].includes(remediation.status) && (
        <>
          <Bars remediation={remediation} />
          <Reasons remediation={remediation} />
          {reason && <p role="alert" className="text-xs text-destructive">{reason}</p>}
          {remediation.status === "FAILED" && remediation.outcome?.kind === "rollback" && (
            <p className="text-xs text-destructive">
              The rollback did not finish. Check the environment by hand.
            </p>
          )}
          {remediation.status === "ROLLED_BACK" && remediation.outcome?.confirmed === false && (
            <p className="text-xs text-muted-foreground">
              The previous commit is back, but there was too little traffic to confirm recovery.
            </p>
          )}
          <RunLink deployment={remediation.rollback ?? remediation.deployment} />
        </>
      )}
    </div>
  );
}
