import { describe, expect, it } from "vitest";
import { scenarios } from "@/lib/dev/investigation-fixtures";
import { deriveStages, isWaitingForReview, runEnd } from "@/lib/stages";
import { deriveGaps, deriveRedaction } from "@/lib/timeline";

const state = (stages: ReturnType<typeof deriveStages>) =>
  Object.fromEntries(stages.map((s) => [s.id, s.state]));

describe("deriveStages", () => {
  it("lights the first stage for a run with no events yet", () => {
    const s = state(deriveStages([]));
    expect(s.context).toBe("active");
    expect(s.fix).toBe("pending");
  });

  it("marks a running run: earlier stages done, the furthest active", () => {
    const { running } = scenarios();
    const s = state(deriveStages(running.events));
    expect(s.context).toBe("done");
    expect(s.triage).toBe("done");
    expect(s.evidence).toBe("active");
    expect(s.hypotheses).toBe("pending");
  });

  it("finishes every stage of a completed run and counts items", () => {
    const { completed } = scenarios();
    const stages = deriveStages(completed.events);
    expect(stages.every((s) => s.state === "done")).toBe(true);
    expect(stages.find((s) => s.id === "evidence")?.count).toBe(3);
    expect(stages.find((s) => s.id === "hypotheses")?.count).toBe(2);
    expect(stages.find((s) => s.id === "fix")?.count).toBe(2);
    expect(stages.some((s) => s.id === "review")).toBe(false);
  });

  it("skips the fix stage when a run completes without proposing changes", () => {
    const { completed } = scenarios();
    const events = completed.events.filter(
      (e) =>
        !["changes.proposed", "changes.validated", "diff.generated"].includes(
          e.type
        )
    );
    expect(state(deriveStages(events)).fix).toBe("skipped");
  });

  it("shows a waiting review in amber and the review stage only when there was one", () => {
    const { review } = scenarios();
    expect(isWaitingForReview(review.events)).toBe(true);
    expect(state(deriveStages(review.events)).review).toBe("waiting");
  });

  it("marks the stage a failed run stopped at", () => {
    const { failed } = scenarios();
    expect(runEnd(failed.events)).toBe("failed");
    const s = state(deriveStages(failed.events));
    expect(s.evidence).toBe("failed");
    expect(s.cause).toBe("pending");
  });
});

describe("run summaries", () => {
  it("lists each gap once", () => {
    const { completed } = scenarios();
    expect(deriveGaps([...completed.events, ...completed.events])).toEqual([
      "Runbooks were not searched (no runbooks uploaded)",
    ]);
  });

  it("totals hidden values and names the kinds", () => {
    const { completed } = scenarios();
    expect(deriveRedaction(completed.events)).toEqual({
      count: 2,
      kinds: ["api key"],
    });
  });
});
