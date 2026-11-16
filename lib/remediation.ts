import type {
  Approver,
  Remediation,
  RemediationStatus,
  Verification,
} from "@/types/remediation";

export type Role = "ADMIN" | "ENGINEER" | "VIEWER" | null;

/** Statuses in which a run is still going (it holds the environment): the screen keeps asking while any remediation is in one. */
const ACTIVE: ReadonlySet<RemediationStatus> = new Set([
  "PREFLIGHT",
  "AWAITING_DEPLOY_APPROVAL",
  "DEPLOYING",
  "VERIFYING",
  "AWAITING_DECISION",
  "AWAITING_ROLLBACK_APPROVAL",
  "ROLLING_BACK",
]);

export function isActive(remediation: Remediation): boolean {
  return ACTIVE.has(remediation.status);
}

export function anyActive(remediations: Remediation[] | undefined): boolean {
  return !!remediations?.some(isActive);
}

export type Tone = "neutral" | "working" | "good" | "bad" | "ask";

const STATUS: Record<RemediationStatus, { label: string; tone: Tone }> = {
  OFFERED: { label: "Ready to deploy", tone: "neutral" },
  PREFLIGHT: { label: "Checking", tone: "working" },
  AWAITING_DEPLOY_APPROVAL: { label: "Waiting for approval", tone: "ask" },
  DEPLOYING: { label: "Deploying", tone: "working" },
  VERIFYING: { label: "Watching the logs", tone: "working" },
  AWAITING_DECISION: { label: "Waiting for your decision", tone: "ask" },
  AWAITING_ROLLBACK_APPROVAL: {
    label: "Waiting for approval to roll back",
    tone: "ask",
  },
  ROLLING_BACK: { label: "Rolling back", tone: "working" },
  VERIFIED: { label: "Verified", tone: "good" },
  ROLLED_BACK: { label: "Rolled back", tone: "neutral" },
  DECLINED: { label: "Not deployed", tone: "neutral" },
  ABANDONED: { label: "Abandoned", tone: "neutral" },
  FAILED: { label: "Failed", tone: "bad" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export function statusLabel(status: RemediationStatus): {
  label: string;
  tone: Tone;
} {
  return STATUS[status] ?? { label: status, tone: "neutral" };
}

export function shortSha(sha: string | null | undefined): string {
  return sha ? sha.slice(0, 7) : "";
}

/** The role an environment needs, as far as its name tells (the service enforces the real rule: production-looking names need an ADMIN). */
export function approverFor(environment: string): Approver {
  return environment.includes("prod") ? "ADMIN" : "ENGINEER";
}

/** Mirrors the service rule: an ADMIN may answer anything, an ENGINEER only where the environment asks for an engineer. */
export function canAnswer(role: Role, approver: Approver): boolean {
  if (role === "ADMIN") return true;
  return role === "ENGINEER" && approver === "ENGINEER";
}

/** A pipeline run link is only followed when it points at GitHub over https. */
export function isSafeRunUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" && parsed.hostname.endsWith("github.com")
    );
  } catch {
    return false;
  }
}

/** Minutes and seconds until `wakeAt`, never negative; null when no timer is set. */
export function countdown(wakeAt: string | null, now: number): string | null {
  if (!wakeAt) return null;
  const target = Date.parse(wakeAt);
  if (Number.isNaN(target)) return null;
  const seconds = Math.max(0, Math.round((target - now) / 1000));
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

export interface Comparison {
  before: number;
  after: number;
  /** Bar widths as a share of the larger of the two (0 to 100), so the two bars are comparable. */
  beforeWidth: number;
  afterWidth: number;
}

/** Errors per minute before the deploy against now, ready to draw as two bars; null when the service has not judged yet. */
export function compare(
  remediation: Remediation,
  verification: Verification | null = remediation.verification
): Comparison | null {
  const numbers = verification?.numbers;
  const before =
    numbers?.baselineErrorsPerMinute ?? remediation.baseline?.errors_per_minute;
  const after = numbers?.errorsPerMinute;
  if (before === undefined || after === undefined) return null;
  const top = Math.max(before, after, 0.0001);
  return {
    before,
    after,
    beforeWidth: (before / top) * 100,
    afterWidth: (after / top) * 100,
  };
}

const FAILURES: Record<number, string> = {
  409: "This was already answered, or is no longer waiting.",
  403: "Your role cannot answer this.",
  404: "This deploy no longer exists.",
  503: "The answer could not be recorded. Try again.",
};

export function remediationErrorMessage(error: unknown): string {
  const response = (
    error as {
      response?: { status?: number; data?: { detail?: unknown } };
    }
  )?.response;
  const detail = response?.data?.detail;
  if (response?.status === 409 && typeof detail === "string" && detail.length < 200) {
    return detail;
  }
  return (
    (response?.status && FAILURES[response.status]) ||
    "Could not send your answer. Try again."
  );
}

/** The reason a run ended badly, as a sentence: what the service stored, or a plain default. */
export function failureReason(remediation: Remediation): string | null {
  const outcome = remediation.outcome ?? {};
  if (typeof outcome.failed === "string") return outcome.failed;
  const refused = outcome.refused;
  if (Array.isArray(refused) && refused.length > 0) return refused.join("; ");
  return remediation.status === "FAILED" ? "The deploy did not complete." : null;
}
