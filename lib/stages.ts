// Where an investigation is, as a short row of stages derived from its event log. Pure, no React.
//
// The graph can loop (verification asks for more evidence), so a stage is "reached" by the furthest event seen,
// and everything before it counts as done. Stages the run never needed (no review gate, no code access) are
// skipped, not left looking unfinished.

import type { StreamEvent } from "@/types/investigation";

export type StageId =
  | "context"
  | "triage"
  | "evidence"
  | "hypotheses"
  | "cause"
  | "review"
  | "fix"
  | "pr";

export type StageState =
  | "done"
  | "active"
  | "waiting"
  | "pending"
  | "skipped"
  | "failed";

export interface Stage {
  id: StageId;
  label: string;
  state: StageState;
  /** How many items the stage produced (evidence, hypotheses, changed files). */
  count?: number;
}

const ORDER: { id: StageId; label: string }[] = [
  { id: "context", label: "Context" },
  { id: "triage", label: "Triage" },
  { id: "evidence", label: "Evidence" },
  { id: "hypotheses", label: "Hypotheses" },
  { id: "cause", label: "Cause" },
  { id: "review", label: "Review" },
  { id: "fix", label: "Fix" },
  { id: "pr", label: "PR" },
];

const STAGE_OF: Record<string, StageId> = {
  "context.loaded": "context",
  "triage.completed": "triage",
  "evidence.added": "evidence",
  "gap.recorded": "evidence",
  "redaction.applied": "evidence",
  "hypothesis.proposed": "hypotheses",
  "hypothesis.updated": "hypotheses",
  "root_cause.identified": "cause",
  "review.requested": "review",
  "review.decided": "review",
  "changes.proposed": "fix",
  "changes.validated": "fix",
  "diff.generated": "fix",
  "pr.approval_requested": "pr",
  "pr.decided": "pr",
  "branch.created": "pr",
  "commit.created": "pr",
  "tests.completed": "pr",
  "pr.opened": "pr",
};

type Loose = Record<string, unknown>;
const payload = (event: StreamEvent): Loose =>
  event.payload && typeof event.payload === "object"
    ? (event.payload as unknown as Loose)
    : {};

export type RunEnd = "completed" | "failed" | "cancelled" | null;

export function runEnd(events: StreamEvent[]): RunEnd {
  for (let i = events.length - 1; i >= 0; i--) {
    const type = events[i].type;
    if (type === "investigation.completed") return "completed";
    if (type === "investigation.failed") return "failed";
    if (type === "investigation.cancelled") return "cancelled";
  }
  return null;
}

/** True when the run stopped at a review that nobody has answered yet. */
export function isWaitingForReview(events: StreamEvent[]): boolean {
  let waiting = false;
  for (const event of events) {
    if (event.type === "review.requested") waiting = true;
    else if (event.type === "review.decided") waiting = false;
  }
  return waiting && runEnd(events) === null;
}

/** True when the run stopped at the pull request approval that nobody has answered yet. */
export function isWaitingForPrApproval(events: StreamEvent[]): boolean {
  let waiting = false;
  for (const event of events) {
    if (event.type === "pr.approval_requested") waiting = true;
    else if (event.type === "pr.decided") waiting = false;
  }
  return waiting && runEnd(events) === null;
}

export function deriveStages(events: StreamEvent[]): Stage[] {
  const end = runEnd(events);
  const seen = new Set<StageId>();
  const counts: Partial<Record<StageId, number>> = {};
  const hypotheses = new Set<string>();
  let reached = -1;

  for (const event of events) {
    const id = STAGE_OF[event.type];
    if (!id) continue;
    seen.add(id);
    reached = Math.max(
      reached,
      ORDER.findIndex((s) => s.id === id)
    );
    if (event.type === "evidence.added") {
      counts.evidence = (counts.evidence ?? 0) + 1;
    } else if (id === "hypotheses") {
      const hid = payload(event).id;
      if (typeof hid === "string") hypotheses.add(hid);
      counts.hypotheses = hypotheses.size;
    } else if (event.type === "diff.generated") {
      const files = payload(event).files;
      counts.fix = Array.isArray(files) ? files.length : undefined;
    }
  }

  const waitingReview = isWaitingForReview(events);
  const waitingPr = isWaitingForPrApproval(events);
  // the review and pull request stages only exist for runs that had one
  const stages = ORDER.filter(
    (s) => (s.id !== "review" && s.id !== "pr") || seen.has(s.id)
  );

  return stages.map(({ id, label }) => {
    const index = ORDER.findIndex((s) => s.id === id);
    let state: StageState;
    if (index < reached) {
      state = "done";
    } else if (index === reached) {
      state =
        end === "failed" || end === "cancelled"
          ? "failed"
          : end === "completed"
            ? "done"
            : (waitingReview && id === "review") || (waitingPr && id === "pr")
              ? "waiting"
              : "active";
    } else {
      state = end === "completed" ? "skipped" : "pending";
    }
    // a run that has not produced any stage event yet is starting: light the first one
    if (reached === -1 && end === null && id === "context") state = "active";
    return { id, label, state, count: counts[id] };
  });
}
