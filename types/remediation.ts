export type RemediationStatus =
  | "OFFERED"
  | "PREFLIGHT"
  | "AWAITING_DEPLOY_APPROVAL"
  | "DEPLOYING"
  | "VERIFYING"
  | "AWAITING_DECISION"
  | "AWAITING_ROLLBACK_APPROVAL"
  | "ROLLING_BACK"
  | "VERIFIED"
  | "ROLLED_BACK"
  | "DECLINED"
  | "ABANDONED"
  | "FAILED"
  | "CANCELLED";

export type Verdict = "healthy" | "degraded" | "inconclusive";
export type DecisionAction = "keep" | "extend" | "rollback";
export type DeployKind = "deploy" | "rollback";
export type Approver = "ADMIN" | "ENGINEER";

export interface Deployment {
  kind: DeployKind;
  status:
    | "dispatched"
    | "running"
    | "succeeded"
    | "failed"
    | "cancelled"
    | "timeout";
  sha: string;
  runUrl: string | null;
  dispatchedAt: string;
  finishedAt: string | null;
}

/** What the service compared for a verdict. Keys are camelCase; `newError` only when another error decided it. */
export interface VerificationNumbers {
  baselineErrorsPerMinute?: number;
  errorsPerMinute?: number;
  minutes?: number;
  traffic?: number;
  minTraffic?: number;
  reasons?: string[];
  newError?: { fingerprint: string; perMinute: number };
}

export interface Verification {
  kind: DeployKind;
  verdict: Verdict;
  numbers: VerificationNumbers;
  windowEnd: string;
  createdAt: string;
}

export interface Remediation {
  id: string;
  pullRequestId: string;
  investigationId: string;
  repositoryId: string;
  environment: string;
  mergeSha: string;
  rollbackTarget: string | null;
  status: RemediationStatus;
  baseline: { errors_per_minute?: number; total_logs?: number } | null;
  policy: { allowed: boolean; reasons: string[] } | null;
  outcome: Record<string, unknown> | null;
  wakeAt: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  deployment: Deployment | null;
  rollback: Deployment | null;
  verification: Verification | null;
}
