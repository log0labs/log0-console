import { describe, expect, it } from "vitest";
import {
  buildDecision,
  decisionErrorMessage,
  MAX_NOTE_LENGTH,
  pendingReview,
  validateDecision,
} from "@/lib/review";
import type { StreamEvent } from "@/types/investigation";

let seq = 0;
function ev(type: string, payload: object = {}): StreamEvent {
  seq += 1;
  return {
    investigationId: "i",
    seq,
    type,
    payload,
    createdAt: "2026-11-15T10:00:00Z",
  } as StreamEvent;
}

const requested = (round = 1, extra: object = {}) =>
  ev("review.requested", {
    round,
    refinesLeft: 2,
    rootCause: "pool too small",
    confidenceBand: "medium",
    evidenceIds: ["e1", "e2"],
    recommendation: "raise the pool",
    ...extra,
  });

describe("pendingReview", () => {
  it("is null when no review was requested", () => {
    expect(pendingReview([])).toBeNull();
    expect(pendingReview([ev("evidence.added", { id: "e1" })])).toBeNull();
  });

  it("returns the waiting review with its fields", () => {
    const review = pendingReview([ev("evidence.added"), requested(1)]);
    expect(review).toMatchObject({
      round: 1,
      refinesLeft: 2,
      rootCause: "pool too small",
      confidenceBand: "medium",
      evidenceIds: ["e1", "e2"],
      recommendation: "raise the pool",
    });
  });

  it("is null once a decision follows it", () => {
    expect(
      pendingReview([requested(), ev("review.decided", { action: "approve" })])
    ).toBeNull();
  });

  it("finds the second round after a refine", () => {
    const events = [
      requested(1),
      ev("review.decided", { action: "refine", note: "check cache" }),
      requested(2, { refinesLeft: 1 }),
    ];
    expect(pendingReview(events)).toMatchObject({ round: 2, refinesLeft: 1 });
  });

  it("ignores a decision that has no request before it", () => {
    expect(
      pendingReview([ev("review.decided", { action: "stop" })])
    ).toBeNull();
  });

  it("reads odd payloads safely", () => {
    const review = pendingReview([
      ev("review.requested", {
        round: "x",
        confidenceBand: "huge",
        evidenceIds: ["a", 3, null],
        recommendation: "",
      }),
    ]);
    expect(review).toMatchObject({
      round: 1,
      refinesLeft: 0,
      rootCause: "",
      confidenceBand: null,
      evidenceIds: ["a"],
      recommendation: null,
    });
  });
});

describe("validateDecision", () => {
  const open = { refinesLeft: 1 };

  it("lets approve and stop through without a note", () => {
    expect(validateDecision("approve", "", open)).toBeNull();
    expect(validateDecision("stop", "", { refinesLeft: 0 })).toBeNull();
  });

  it("needs a real note to refine, counted after trimming", () => {
    expect(validateDecision("refine", "  ab ", open)).toMatch(/at least 3/);
    expect(validateDecision("refine", "abc", open)).toBeNull();
  });

  it("caps the note length", () => {
    expect(
      validateDecision("refine", "x".repeat(MAX_NOTE_LENGTH + 1), open)
    ).toMatch(/under/);
    expect(
      validateDecision("refine", "x".repeat(MAX_NOTE_LENGTH), open)
    ).toBeNull();
  });

  it("refuses a refine when none are left", () => {
    expect(
      validateDecision("refine", "valid note", { refinesLeft: 0 })
    ).toMatch(/No refinements left/);
  });
});

describe("buildDecision", () => {
  it("sends the trimmed note only for a refine", () => {
    expect(buildDecision("refine", "  look at redis  ")).toEqual({
      action: "refine",
      note: "look at redis",
    });
    expect(buildDecision("approve", "left over text")).toEqual({
      action: "approve",
    });
    expect(buildDecision("stop", "x")).toEqual({ action: "stop" });
  });
});

describe("decisionErrorMessage", () => {
  const withStatus = (status: number) => ({ response: { status } });

  it("explains the statuses the service uses", () => {
    expect(decisionErrorMessage(withStatus(409))).toMatch(/already answered/);
    expect(decisionErrorMessage(withStatus(403))).toMatch(/role/);
    expect(decisionErrorMessage(withStatus(422))).toMatch(/note/);
    expect(decisionErrorMessage(withStatus(503))).toMatch(/recorded/);
  });

  it("falls back for anything else", () => {
    expect(decisionErrorMessage(new Error("x"))).toMatch(/Try again/);
  });
});
