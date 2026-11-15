// The draft pull request flow, read from an investigation's event log. Pure functions, no React.

import type {
  CiOutcome,
  ConfidenceBand,
  StreamEvent,
} from "@/types/investigation";

export interface PendingPr {
  repository: string;
  branch: string;
  defaultBranch: string;
  files: { path: string; operation: string; additions: number; deletions: number }[];
  rootCause: string;
  confidenceBand: ConfidenceBand | null;
  seq: number;
}

type Loose = Record<string, unknown>;
const obj = (event: StreamEvent): Loose =>
  event.payload && typeof event.payload === "object"
    ? (event.payload as unknown as Loose)
    : {};
const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" ? v : 0);

/** The approval that is waiting: the latest `pr.approval_requested`, unless a `pr.decided` came after it. */
export function pendingPrApproval(events: StreamEvent[]): PendingPr | null {
  let requested: StreamEvent | null = null;
  for (const event of events) {
    if (event.type === "pr.approval_requested") requested = event;
    else if (event.type === "pr.decided") requested = null;
  }
  if (!requested) return null;
  const p = obj(requested);
  const band = p.confidenceBand;
  return {
    repository: str(p.repository),
    branch: str(p.branch),
    defaultBranch: str(p.defaultBranch),
    files: Array.isArray(p.files)
      ? p.files.map((f) => {
          const file = (f ?? {}) as Loose;
          return {
            path: str(file.path),
            operation: str(file.operation),
            additions: num(file.additions),
            deletions: num(file.deletions),
          };
        })
      : [],
    rootCause: str(p.rootCause),
    confidenceBand:
      band === "high" || band === "medium" || band === "low" ? band : null,
    seq: requested.seq,
  };
}

export interface PullRequestProgress {
  /** declined: the engineer said no; publishing: approved, not finished; opened: the draft exists. */
  phase: "declined" | "publishing" | "opened";
  branch: string | null;
  commit: string | null;
  tests: { outcome: CiOutcome; checks: { name: string; conclusion: string }[] } | null;
  pr: { number: number; url: string } | null;
}

/** Where the pull request is, from the events after its approval was asked for. Null when it never came up. */
export function pullRequestProgress(
  events: StreamEvent[]
): PullRequestProgress | null {
  let seen = false;
  const progress: PullRequestProgress = {
    phase: "publishing",
    branch: null,
    commit: null,
    tests: null,
    pr: null,
  };
  for (const event of events) {
    const p = obj(event);
    switch (event.type) {
      case "pr.approval_requested":
        seen = true;
        break;
      case "pr.decided":
        seen = true;
        if (p.action === "decline") progress.phase = "declined";
        break;
      case "branch.created":
        progress.branch = str(p.name) || null;
        break;
      case "commit.created":
        progress.commit = str(p.sha) || null;
        break;
      case "tests.completed": {
        const outcome = p.outcome;
        if (
          outcome === "passed" ||
          outcome === "failed" ||
          outcome === "none" ||
          outcome === "timeout"
        ) {
          progress.tests = {
            outcome,
            checks: Array.isArray(p.checks)
              ? p.checks.map((c) => ({
                  name: str((c as Loose)?.name),
                  conclusion: str((c as Loose)?.conclusion),
                }))
              : [],
          };
        }
        break;
      }
      case "pr.opened":
        progress.phase = "opened";
        progress.pr = { number: num(p.number), url: str(p.url) };
        break;
    }
  }
  return seen || progress.pr ? progress : null;
}

/** Only an https GitHub link is rendered as one; anything else is shown as text. */
export function isSafePrUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.endsWith("github.com");
  } catch {
    return false;
  }
}

export function prDecisionErrorMessage(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  switch (status) {
    case 409:
      return "This was already answered.";
    case 403:
      return "Your role cannot answer this.";
    case 503:
      return "The answer could not be recorded. Try again.";
    default:
      return "Could not send your answer. Try again.";
  }
}
