// Turn an investigation's event log into the rows the panel shows. Pure functions, no React.
//
// Rules: one row per meaningful event; a hypothesis that is later updated changes its own row instead of
// adding a new one; events the panel has no row for (started, completed) are not listed, their state is
// the status badge. Payloads are read defensively: the log is data from another service, and one odd
// event must not break the whole panel.

import type {
  EvidenceKind,
  HypothesisStatus,
  StreamEvent,
} from "@/types/investigation";

export type Tone = "info" | "success" | "warning" | "error";

export interface TimelineRow {
  /** Stable key: the seq of the event that created the row. */
  key: number;
  type: string;
  tone: Tone;
  title: string;
  detail?: string;
  at: string;
}

export interface EvidenceItem {
  id: string;
  kind: EvidenceKind | string;
  summary: string;
  /** Secrets or personal values hidden in this evidence before analysis. */
  redacted: number;
  seq: number;
}

export interface HypothesisItem {
  id: string;
  statement: string;
  status: HypothesisStatus | string;
  supporting: number;
  contradicting: number;
  seq: number;
}

type Loose = Record<string, unknown>;

const text = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;
const num = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const obj = (event: StreamEvent): Loose =>
  event.payload && typeof event.payload === "object"
    ? (event.payload as unknown as Loose)
    : {};

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** All pieces of evidence the run has recorded, in order, each id once. */
export function deriveEvidence(events: StreamEvent[]): EvidenceItem[] {
  const seen = new Set<string>();
  const items: EvidenceItem[] = [];
  for (const event of events) {
    if (event.type !== "evidence.added") continue;
    const p = obj(event);
    const id = text(p.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    items.push({
      id,
      kind: text(p.kind, "log"),
      summary: text(p.summary),
      redacted: num(p.redacted),
      seq: event.seq,
    });
  }
  return items;
}

/** What the run could not examine (a source was down, a step could not conclude), each message once. */
export function deriveGaps(events: StreamEvent[]): string[] {
  const gaps = new Set<string>();
  for (const event of events) {
    if (event.type !== "gap.recorded") continue;
    const message = text(obj(event).message).trim();
    if (message) gaps.add(message);
  }
  return [...gaps];
}

/** How many sensitive values were hidden across the whole run, and which kinds. */
export function deriveRedaction(events: StreamEvent[]): {
  count: number;
  kinds: string[];
} {
  let count = 0;
  const kinds = new Set<string>();
  for (const event of events) {
    if (event.type !== "redaction.applied") continue;
    const p = obj(event);
    count += num(p.count);
    if (p.kinds && typeof p.kinds === "object") {
      for (const kind of Object.keys(p.kinds as Record<string, unknown>)) {
        kinds.add(kind.replaceAll("_", " "));
      }
    }
  }
  return { count, kinds: [...kinds].sort() };
}

/** The hypotheses with their latest status: an update replaces the earlier version. */
export function deriveHypotheses(events: StreamEvent[]): HypothesisItem[] {
  const byId = new Map<string, HypothesisItem>();
  for (const event of events) {
    if (
      event.type !== "hypothesis.proposed" &&
      event.type !== "hypothesis.updated"
    )
      continue;
    const p = obj(event);
    const id = text(p.id);
    if (!id) continue;
    const previous = byId.get(id);
    byId.set(id, {
      id,
      statement: text(p.statement, previous?.statement ?? ""),
      status: text(p.status, previous?.status ?? "open"),
      supporting: list(p.supportingEvidence).length,
      contradicting: list(p.contradictingEvidence).length,
      seq: previous?.seq ?? event.seq,
    });
  }
  return [...byId.values()];
}

const HYPOTHESIS_TONE: Record<string, Tone> = {
  supported: "success",
  refuted: "warning",
  open: "info",
};

export function buildTimeline(events: StreamEvent[]): TimelineRow[] {
  const hypotheses = new Map(deriveHypotheses(events).map((h) => [h.id, h]));
  const rows: TimelineRow[] = [];
  const row = (
    event: StreamEvent,
    tone: Tone,
    title: string,
    detail?: string
  ) =>
    rows.push({
      key: event.seq,
      type: event.type,
      tone,
      title,
      detail: detail || undefined,
      at: event.createdAt,
    });

  for (const event of events) {
    const p = obj(event);
    switch (event.type) {
      case "context.loaded":
        row(
          event,
          "info",
          "Loaded incident context",
          [text(p.service), text(p.environment), text(p.severity)]
            .filter(Boolean)
            .join(" / ") +
            (num(p.occurrenceCount)
              ? `, ${plural(num(p.occurrenceCount), "occurrence")}`
              : "")
        );
        break;
      case "triage.completed":
        row(
          event,
          "info",
          `Triage: ${text(p.category, "unknown")}`,
          text(p.summary)
        );
        break;
      case "evidence.added":
        row(
          event,
          "info",
          `Evidence (${text(p.kind, "log")})`,
          text(p.summary)
        );
        break;
      case "redaction.applied": {
        const kinds =
          p.kinds && typeof p.kinds === "object"
            ? Object.keys(p.kinds as Record<string, unknown>).sort()
            : [];
        row(
          event,
          "info",
          "Sensitive values hidden before analysis",
          `${plural(num(p.count), "value")}${kinds.length ? ` (${kinds.join(", ").replaceAll("_", " ")})` : ""}`
        );
        break;
      }
      case "gap.recorded":
        row(event, "warning", "Gap", text(p.message));
        break;
      case "hypothesis.proposed": {
        const h = hypotheses.get(text(p.id));
        row(
          event,
          HYPOTHESIS_TONE[h?.status ?? "open"] ?? "info",
          `Hypothesis (${h?.status ?? "open"})`,
          h?.statement ?? text(p.statement)
        );
        break;
      }
      case "hypothesis.updated":
        // folded into the row of the proposal; an update with no proposal still deserves a row
        if (
          !hypotheses.has(text(p.id)) ||
          hypotheses.get(text(p.id))!.seq === event.seq
        ) {
          const h = hypotheses.get(text(p.id));
          row(
            event,
            HYPOTHESIS_TONE[h?.status ?? "open"] ?? "info",
            `Hypothesis (${h?.status ?? "open"})`,
            h?.statement ?? text(p.statement)
          );
        }
        break;
      case "root_cause.identified":
        row(
          event,
          "success",
          `Root cause${p.confidenceBand ? ` (${text(p.confidenceBand)} confidence)` : ""}`,
          text(p.statement)
        );
        break;
      case "review.requested":
        row(
          event,
          "warning",
          `Waiting for your review (round ${num(p.round, 1)})`,
          text(p.rootCause)
        );
        break;
      case "review.decided": {
        const action = text(p.action);
        const note = text(p.note);
        row(
          event,
          action === "stop" ? "warning" : "info",
          action === "approve"
            ? "Review: approved"
            : action === "refine"
              ? "Review: asked to refine"
              : action === "stop"
                ? "Review: stopped"
                : "Review decided",
          note
        );
        break;
      }
      case "changes.proposed": {
        const files = list(p.files)
          .map((f) => text(f))
          .filter(Boolean);
        row(
          event,
          "info",
          `Proposed ${plural(num(p.count, files.length), "change")}`,
          files.join(", ")
        );
        break;
      }
      case "changes.validated":
        row(
          event,
          p.ok ? "success" : "warning",
          p.ok ? "Changes validated" : "Changes did not validate",
          p.ok ? undefined : plural(num(p.issueCount), "issue")
        );
        break;
      case "diff.generated":
        row(
          event,
          "success",
          "Diff ready",
          `${plural(list(p.files).length, "file")}, ${num(p.bytes)} bytes`
        );
        break;
      case "pr.approval_requested":
        row(event, "warning", "Waiting for your approval to open a draft pull request", text(p.repository));
        break;
      case "pr.decided":
        row(event, text(p.action) === "approve" ? "info" : "warning", text(p.action) === "approve" ? "Pull request approved" : "Pull request declined");
        break;
      case "branch.created":
        row(event, "info", "Branch created", text(p.name));
        break;
      case "commit.created":
        row(event, "info", "Change committed", text(p.sha).slice(0, 7));
        break;
      case "tests.completed": {
        const outcome = text(p.outcome);
        row(
          event,
          outcome === "passed" ? "success" : outcome === "failed" ? "error" : "warning",
          outcome === "passed"
            ? "Checks passed"
            : outcome === "failed"
              ? "Checks failed"
              : outcome === "timeout"
                ? "Checks still running"
                : "No checks on the repository",
          plural(list(p.checks).length, "check")
        );
        break;
      }
      case "pr.merged":
        row(event, "success", "Pull request merged");
        break;
      case "pr.closed":
        row(event, "warning", "Pull request closed without merging");
        break;
      case "pr.open":
        row(event, "info", "Pull request reopened");
        break;
      case "pr.opened":
        row(event, "success", "Draft pull request opened", `#${num(p.number)}`);
        break;
      case "investigation.failed":
        row(event, "error", "Failed", text(p.error));
        break;
      case "investigation.cancelled":
        row(event, "warning", "Cancelled");
        break;
      default:
        break; // started / completed (and unknown types) have no row
    }
  }
  return rows;
}
