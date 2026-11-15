import { describe, expect, it } from "vitest";

import {
  isSafePrUrl,
  pendingPrApproval,
  prDecisionErrorMessage,
  pullRequestProgress,
} from "@/lib/pull-request";
import { deriveStages, isWaitingForPrApproval } from "@/lib/stages";
import { buildTimeline } from "@/lib/timeline";
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

const requested = () =>
  ev("pr.approval_requested", {
    repository: "acme/shop",
    branch: "log0/fix-a-b",
    defaultBranch: "main",
    baseSha: "abc",
    files: [{ path: "a.js", operation: "modify", additions: 2, deletions: 1 }],
    rootCause: "pool too small",
    confidenceBand: "high",
  });

describe("pendingPrApproval", () => {
  it("is the latest request until it is decided", () => {
    const first = requested();
    expect(pendingPrApproval([first])).toMatchObject({
      repository: "acme/shop",
      branch: "log0/fix-a-b",
      defaultBranch: "main",
      confidenceBand: "high",
      seq: first.seq,
      files: [{ path: "a.js", additions: 2, deletions: 1 }],
    });
    expect(
      pendingPrApproval([first, ev("pr.decided", { action: "approve" })])
    ).toBeNull();
  });

  it("is null when there is no request and tolerates odd payloads", () => {
    expect(pendingPrApproval([])).toBeNull();
    const odd = ev("pr.approval_requested", { files: "nope", confidenceBand: 3 });
    expect(pendingPrApproval([odd])).toMatchObject({ files: [], confidenceBand: null, repository: "" });
  });
});

describe("files outside the root cause", () => {
  it("are carried to the approval, and a file without the flag counts as part of the cause", () => {
    const withFlags = ev("pr.approval_requested", {
      files: [
        { path: "src/db.js", operation: "modify", additions: 1, deletions: 2, inRootCause: true },
        { path: "src/seed.js", operation: "modify", additions: 1, deletions: 0, inRootCause: false },
        { path: "old.js", operation: "modify", additions: 1, deletions: 0 },
      ],
    });
    expect(pendingPrApproval([withFlags])?.files.map((f) => f.inRootCause)).toEqual([true, false, true]);
  });
});

describe("pullRequestProgress", () => {
  it("is null for a run that never reached the pull request step", () => {
    expect(pullRequestProgress([ev("diff.generated", { files: [] })])).toBeNull();
  });

  it("follows the run from approval to an opened draft with its checks", () => {
    const events = [
      requested(),
      ev("pr.decided", { action: "approve" }),
      ev("branch.created", { name: "log0/fix-a-b" }),
    ];
    expect(pullRequestProgress(events)).toMatchObject({ phase: "publishing", branch: "log0/fix-a-b", commit: null, pr: null });

    const done = [
      ...events,
      ev("commit.created", { sha: "b7d2e9f" }),
      ev("tests.completed", { outcome: "failed", checks: [{ name: "ci", conclusion: "failure" }] }),
      ev("pr.opened", { number: 7, url: "https://github.com/acme/shop/pull/7" }),
    ];
    expect(pullRequestProgress(done)).toEqual({
      outcome: "open",
      phase: "opened",
      branch: "log0/fix-a-b",
      commit: "b7d2e9f",
      tests: {
        outcome: "failed",
        source: "repository",
        checks: [{ name: "ci", conclusion: "failure" }],
      },
      pr: { number: 7, url: "https://github.com/acme/shop/pull/7" },
    });
  });

  it("knows a decline, and ignores an unknown test outcome", () => {
    expect(pullRequestProgress([requested(), ev("pr.decided", { action: "decline" })])?.phase).toBe("declined");
    expect(pullRequestProgress([requested(), ev("tests.completed", { outcome: "weird" })])?.tests).toBeNull();
  });
});

describe("isSafePrUrl", () => {
  it("accepts only https GitHub links", () => {
    expect(isSafePrUrl("https://github.com/a/b/pull/1")).toBe(true);
    expect(isSafePrUrl("http://github.com/a/b/pull/1")).toBe(false);
    expect(isSafePrUrl("javascript:alert(1)")).toBe(false);
    expect(isSafePrUrl("https://evil.example/github.com")).toBe(false);
    expect(isSafePrUrl("not a url")).toBe(false);
  });
});

describe("the stage rail", () => {
  const upToDiff = () => [
    ev("context.loaded", {}),
    ev("triage.completed", {}),
    ev("root_cause.identified", {}),
    ev("diff.generated", { files: [] }),
  ];

  it("has no pull request stage when none came up", () => {
    expect(deriveStages(upToDiff()).map((s) => s.id)).not.toContain("pr");
  });

  it("waits at the pull request stage until answered", () => {
    const events = [...upToDiff(), requested()];
    expect(isWaitingForPrApproval(events)).toBe(true);
    expect(deriveStages(events).find((s) => s.id === "pr")?.state).toBe("waiting");
    const answered = [...events, ev("pr.decided", { action: "approve" })];
    expect(isWaitingForPrApproval(answered)).toBe(false);
    expect(deriveStages(answered).find((s) => s.id === "pr")?.state).toBe("active");
  });

  it("is done when the run completes", () => {
    const events = [...upToDiff(), requested(), ev("pr.decided", { action: "decline" }), ev("investigation.completed")];
    expect(deriveStages(events).find((s) => s.id === "pr")?.state).toBe("done");
  });
});

describe("the timeline", () => {
  it("describes each pull request step in words", () => {
    const rows = buildTimeline([
      requested(),
      ev("pr.decided", { action: "approve" }),
      ev("branch.created", { name: "log0/fix-a-b" }),
      ev("commit.created", { sha: "b7d2e9f4c1" }),
      ev("tests.completed", { outcome: "none", checks: [] }),
      ev("pr.opened", { number: 7 }),
    ]);
    expect(rows.map((r) => r.title)).toEqual([
      "Waiting for your approval to open a draft pull request",
      "Pull request approved",
      "Branch created",
      "Change committed",
      "No checks on the repository",
      "Draft pull request opened",
    ]);
    expect(rows[3].detail).toBe("b7d2e9f");
    expect(rows[5].detail).toBe("#7");
  });
});

describe("prDecisionErrorMessage", () => {
  it("explains the failures that can happen", () => {
    const status = (n: number) => ({ response: { status: n } });
    expect(prDecisionErrorMessage(status(409))).toMatch(/already answered/);
    expect(prDecisionErrorMessage(status(403))).toMatch(/role/);
    expect(prDecisionErrorMessage(status(503))).toMatch(/Try again/);
    expect(prDecisionErrorMessage(new Error("x"))).toMatch(/Could not send/);
  });
});

describe("what a human did with the pull request", () => {
  const opened = () => [
    requested(),
    ev("pr.decided", { action: "approve" }),
    ev("pr.opened", { number: 7, url: "https://github.com/acme/shop/pull/7" }),
  ];

  it("shows merged, closed and reopened", () => {
    expect(pullRequestProgress(opened())?.outcome).toBe("open");
    expect(pullRequestProgress([...opened(), ev("pr.merged", { number: 7 })])?.outcome).toBe("merged");
    expect(pullRequestProgress([...opened(), ev("pr.closed", { number: 7 })])?.outcome).toBe("closed");
    expect(
      pullRequestProgress([...opened(), ev("pr.closed", { number: 7 }), ev("pr.open", { number: 7 })])?.outcome
    ).toBe("open");
  });

  it("describes a repair after failing checks", () => {
    expect(buildTimeline([ev("repair.started", { attempt: 1, logLines: 12 })]).map((r) => r.title)).toEqual([
      "The checks failed: trying one corrected change",
    ]);
  });

  it("describes them in the timeline", () => {
    const rows = buildTimeline([ev("pr.merged"), ev("pr.closed"), ev("pr.open")]);
    expect(rows.map((r) => r.title)).toEqual([
      "Pull request merged",
      "Pull request closed without merging",
      "Pull request reopened",
    ]);
  });
});
