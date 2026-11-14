import { describe, expect, it } from "vitest";
import {
  buildTimeline,
  deriveEvidence,
  deriveHypotheses,
  plural,
} from "@/lib/timeline";
import type { StreamEvent } from "@/types/investigation";

let seq = 0;
function ev(type: string, payload: object = {}): StreamEvent {
  seq += 1;
  return {
    investigationId: "inv-1",
    seq,
    type,
    payload,
    createdAt: "2026-11-15T10:00:00Z",
  } as StreamEvent;
}

const hyp = (id: string, status: string, statement = `stmt ${id}`) => ({
  id,
  statement,
  status,
  supportingEvidence: ["e1", "e2"],
  contradictingEvidence: ["e3"],
});

describe("buildTimeline", () => {
  it("makes one row per meaningful event and skips started/completed", () => {
    const rows = buildTimeline([
      ev("investigation.started"),
      ev("context.loaded", {
        service: "payments",
        environment: "prod",
        severity: "HIGH",
        occurrenceCount: 12,
      }),
      ev("triage.completed", { category: "database", summary: "pool full" }),
      ev("evidence.added", { id: "e1", kind: "log", summary: "timeouts" }),
      ev("gap.recorded", { message: "no repository linked" }),
      ev("investigation.completed"),
    ]);
    expect(rows.map((r) => r.type)).toEqual([
      "context.loaded",
      "triage.completed",
      "evidence.added",
      "gap.recorded",
    ]);
    expect(rows[0].detail).toBe("payments / prod / HIGH, 12 occurrences");
    expect(rows[1].title).toBe("Triage: database");
    expect(rows[3]).toMatchObject({
      tone: "warning",
      detail: "no repository linked",
    });
  });

  it("keeps rows in event order and keys them by seq", () => {
    const rows = buildTimeline([
      ev("gap.recorded", { message: "a" }),
      ev("gap.recorded", { message: "b" }),
    ]);
    expect(rows.map((r) => r.detail)).toEqual(["a", "b"]);
    expect(rows[1].key).toBeGreaterThan(rows[0].key);
  });

  it("folds a hypothesis update into the row of its proposal", () => {
    const rows = buildTimeline([
      ev("hypothesis.proposed", hyp("h1", "open", "pool exhausted")),
      ev("evidence.added", { id: "e1", kind: "log", summary: "x" }),
      ev("hypothesis.updated", hyp("h1", "supported", "pool exhausted")),
    ]);
    const hypothesisRows = rows.filter((r) => r.type.startsWith("hypothesis"));
    expect(hypothesisRows).toHaveLength(1);
    expect(hypothesisRows[0]).toMatchObject({
      tone: "success",
      title: "Hypothesis (supported)",
      detail: "pool exhausted",
    });
  });

  it("still shows an update that has no proposal before it", () => {
    const rows = buildTimeline([
      ev("hypothesis.updated", hyp("h9", "refuted")),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      tone: "warning",
      title: "Hypothesis (refuted)",
    });
  });

  it("describes the review gate", () => {
    const rows = buildTimeline([
      ev("review.requested", { round: 2, rootCause: "bad deploy" }),
      ev("review.decided", { action: "refine", note: "check the cache" }),
      ev("review.decided", { action: "approve", note: null }),
      ev("review.decided", { action: "stop", note: null }),
    ]);
    expect(rows[0]).toMatchObject({
      title: "Waiting for your review (round 2)",
      detail: "bad deploy",
    });
    expect(rows[1]).toMatchObject({
      title: "Review: asked to refine",
      detail: "check the cache",
    });
    expect(rows[2].title).toBe("Review: approved");
    expect(rows[3]).toMatchObject({
      title: "Review: stopped",
      tone: "warning",
    });
  });

  it("describes the root cause with its confidence", () => {
    const [row] = buildTimeline([
      ev("root_cause.identified", {
        statement: "pool too small",
        confidenceBand: "high",
      }),
    ]);
    expect(row).toMatchObject({
      tone: "success",
      title: "Root cause (high confidence)",
      detail: "pool too small",
    });
    const [bare] = buildTimeline([
      ev("root_cause.identified", { statement: "s" }),
    ]);
    expect(bare.title).toBe("Root cause");
  });

  it("describes changes, validation and the diff", () => {
    const rows = buildTimeline([
      ev("changes.proposed", { count: 2, files: ["a.py", "b.py"] }),
      ev("changes.validated", { ok: false, issueCount: 1 }),
      ev("changes.validated", { ok: true, issueCount: 0 }),
      ev("diff.generated", { bytes: 321, files: [{ path: "a.py" }] }),
    ]);
    expect(rows[0]).toMatchObject({
      title: "Proposed 2 changes",
      detail: "a.py, b.py",
    });
    expect(rows[1]).toMatchObject({ tone: "warning", detail: "1 issue" });
    expect(rows[2]).toMatchObject({
      tone: "success",
      title: "Changes validated",
    });
    expect(rows[3].detail).toBe("1 file, 321 bytes");
  });

  it("shows failure and cancellation", () => {
    const rows = buildTimeline([
      ev("investigation.failed", { error: "model unavailable" }),
      ev("investigation.cancelled"),
    ]);
    expect(rows[0]).toMatchObject({
      tone: "error",
      detail: "model unavailable",
    });
    expect(rows[1]).toMatchObject({ tone: "warning", title: "Cancelled" });
  });

  it("survives malformed payloads and unknown event types", () => {
    const rows = buildTimeline([
      ev("evidence.added", { id: 5, kind: null }),
      ev("triage.completed", null as unknown as object),
      ev("something.new", { a: 1 }),
      ev("changes.proposed", { files: "nope", count: "x" }),
    ]);
    expect(rows.map((r) => r.type)).toEqual([
      "evidence.added",
      "triage.completed",
      "changes.proposed",
    ]);
    expect(rows[2].title).toBe("Proposed 0 changes");
  });

  it("returns nothing for no events", () => {
    expect(buildTimeline([])).toEqual([]);
  });
});

describe("deriveEvidence", () => {
  it("lists each evidence id once, in order, ignoring other events and bad ones", () => {
    const items = deriveEvidence([
      ev("evidence.added", { id: "e1", kind: "log", summary: "one" }),
      ev("gap.recorded", { message: "x" }),
      ev("evidence.added", { id: "e2", kind: "code", summary: "two" }),
      ev("evidence.added", { id: "e1", kind: "log", summary: "repeat" }),
      ev("evidence.added", { kind: "log", summary: "no id" }),
    ]);
    expect(items.map((i) => [i.id, i.kind, i.summary])).toEqual([
      ["e1", "log", "one"],
      ["e2", "code", "two"],
    ]);
  });
});

describe("deriveHypotheses", () => {
  it("keeps the latest status and counts the evidence", () => {
    const [h] = deriveHypotheses([
      ev("hypothesis.proposed", hyp("h1", "open")),
      ev("hypothesis.updated", hyp("h1", "refuted")),
    ]);
    expect(h).toMatchObject({
      id: "h1",
      status: "refuted",
      supporting: 2,
      contradicting: 1,
    });
  });

  it("keeps different hypotheses apart", () => {
    expect(
      deriveHypotheses([
        ev("hypothesis.proposed", hyp("h1", "open")),
        ev("hypothesis.proposed", hyp("h2", "open")),
      ])
    ).toHaveLength(2);
  });
});

describe("plural", () => {
  it("adds an s except for one", () => {
    expect(plural(1, "file")).toBe("1 file");
    expect(plural(0, "file")).toBe("0 files");
    expect(plural(2, "entry", "entries")).toBe("2 entries");
  });
});
