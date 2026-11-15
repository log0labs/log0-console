// Shapes of the ai-service API (all JSON is camelCase) and of the events it streams.

export type InvestigationStatus =
  | "QUEUED"
  | "RUNNING"
  | "AWAITING_REVIEW"
  | "AWAITING_PR_APPROVAL"
  | "PUBLISHING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

/** A status in which the investigation can still change (and the incident cannot start another). */
export const ACTIVE_STATUSES: readonly InvestigationStatus[] = [
  "QUEUED",
  "RUNNING",
  "AWAITING_REVIEW",
  "AWAITING_PR_APPROVAL",
  "PUBLISHING",
];

export interface InvestigationScope {
  logs: boolean;
  history: boolean;
  code: boolean;
  runbooks: boolean;
  docs: boolean;
}

export type ConfidenceBand = "high" | "medium" | "low";

export interface CodeLocation {
  filePath: string;
  line: number | null;
  function: string | null;
}

export interface RootCause {
  statement: string;
  hypothesisId: string | null;
  evidenceIds: string[];
  affectedLocations: CodeLocation[];
  contributingFactors: string[];
  unresolvedQuestions: string[];
}

export type ChangeOperation = "modify" | "add" | "delete";

export interface CodeChange {
  filePath: string;
  operation: ChangeOperation;
  explanation: string;
  oldCode: string | null;
  newCode: string | null;
}

export interface Recommendation {
  summary: string;
  rationale: string;
  changes: CodeChange[];
  risks: string[];
  testsRequired: string[];
  verificationSteps: string[];
}

export interface Investigation {
  id: string;
  incidentId: string;
  requestedBy: string;
  status: InvestigationStatus;
  question: string | null;
  scope: InvestigationScope;
  provider: string | null;
  model: string | null;
  promptVersion: string | null;
  graphVersion: string | null;
  repoSha: string | null;
  rootCause: RootCause | null;
  recommendation: Recommendation | null;
  /** A unified diff that passed validation and `git apply --check`; null when there is none. */
  diff: string | null;
  confidenceBand: ConfidenceBand | null;
  error: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  /** A decimal: the API may send a number or a string. */
  costUsd: number | string | null;
  toolCallCount: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvestigationRequest {
  incidentId: string;
  question?: string | null;
  scope?: Partial<InvestigationScope>;
}

export interface CreateInvestigationResponse {
  investigationId: string;
  status: InvestigationStatus;
}

export type PrAction = "approve" | "decline";

/** What the repository's own CI said about the commit log0 made. */
export type CiOutcome = "passed" | "failed" | "none" | "timeout";

export type ReviewAction = "approve" | "refine" | "stop";

export interface ResumeInvestigationRequest {
  action: ReviewAction;
  /** Required (at least 3 characters) when refining. */
  note?: string | null;
}

// ---------------------------------------------------------------------------- stream events

export type EvidenceKind =
  | "log"
  | "timeline"
  | "incident"
  | "code"
  | "commit"
  | "runbook"
  | "doc"
  | "memory";

export type HypothesisStatus = "open" | "supported" | "refuted";

/** The payload of each event type (see the ai-service's `graph/events.py` and the runner). */
export interface EventPayloads {
  "investigation.started": Record<string, never>;
  "context.loaded": {
    service: string;
    environment: string;
    severity: string;
    occurrenceCount: number;
    stackFrames: number;
  };
  "triage.completed": {
    category: string;
    summary: string;
    gather: string[];
    hypotheses: string[];
  };
  "evidence.added": {
    id: string;
    kind: EvidenceKind;
    summary: string;
    /** How many secrets or personal values were hidden in this evidence before analysis. */
    redacted?: number;
  };
  "redaction.applied": { count: number; kinds: Record<string, number> };
  "gap.recorded": { message: string };
  "hypothesis.proposed": HypothesisPayload;
  "hypothesis.updated": HypothesisPayload;
  "root_cause.identified": {
    statement: string;
    evidenceIds: string[];
    hypothesisId: string | null;
    confidenceBand: ConfidenceBand | null;
    contributingFactors: string[];
    unresolvedQuestions: string[];
    recommendation: string | null;
  };
  "review.requested": {
    round: number;
    refinesLeft: number;
    rootCause: string;
    confidenceBand: ConfidenceBand | null;
    evidenceIds: string[];
    recommendation: string | null;
  };
  "review.decided": {
    action: ReviewAction;
    note: string | null;
    decidedBy: string;
  };
  "changes.proposed": {
    count: number;
    files: string[];
    operations: ChangeOperation[];
  };
  "changes.validated": { ok: boolean; issueCount: number };
  "diff.generated": {
    bytes: number;
    files: {
      path: string;
      operation: ChangeOperation;
      additions: number;
      deletions: number;
    }[];
  };
  "pr.approval_requested": {
    repository: string;
    branch: string;
    defaultBranch: string;
    baseSha: string;
    files: { path: string; operation: ChangeOperation; additions: number; deletions: number }[];
    rootCause: string;
    confidenceBand: ConfidenceBand | null;
  };
  "pr.decided": { action: PrAction; decidedBy: string };
  "branch.created": { name: string; baseSha: string };
  "commit.created": { sha: string };
  "tests.completed": {
    outcome: CiOutcome;
    checks: { name: string; conclusion: string }[];
    /** Whose tests: the repository's own CI, or log0's isolated sandbox. */
    source?: "repository" | "sandbox";
  };
  "pr.opened": { number: number; url: string; branch: string; draft: boolean };
  "investigation.completed": Record<string, never>;
  "investigation.failed": { error: string };
  "investigation.cancelled": Record<string, never>;
}

export interface HypothesisPayload {
  id: string;
  statement: string;
  status: HypothesisStatus;
  supportingEvidence: string[];
  contradictingEvidence: string[];
}

export type EventType = keyof EventPayloads;

/** One row of an investigation's event log, as sent by `/events` and `/stream`. */
export interface StreamEvent<T extends string = string> {
  investigationId: string;
  seq: number;
  type: T;
  payload: T extends EventType ? EventPayloads[T] : Record<string, unknown>;
  createdAt: string;
}

/** Event types after which nothing more will be sent for a run (a waiting review is not one of them). */
export const TERMINAL_EVENT_TYPES: readonly string[] = [
  "investigation.completed",
  "investigation.failed",
  "investigation.cancelled",
];

/** The newest investigation of one incident, as `GET /investigations/latest` returns it (for list views). */
export interface LatestInvestigation {
  incidentId: string;
  investigationId: string;
  status: InvestigationStatus;
  confidenceBand: ConfidenceBand | null;
  hasDiff: boolean;
  hasPullRequest: boolean;
  createdAt: string;
}
