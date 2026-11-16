import { describe, expect, it } from "vitest";

import {
  anyActive,
  approverFor,
  canAnswer,
  compare,
  countdown,
  failureReason,
  isSafeRunUrl,
  remediationErrorMessage,
  shortSha,
  statusLabel,
} from "@/lib/remediation";
import type { Remediation } from "@/types/remediation";

function remediation(over: Partial<Remediation> = {}): Remediation {
  return {
    id: "r",
    pullRequestId: "p",
    investigationId: "i",
    repositoryId: "repo",
    environment: "staging",
    mergeSha: "c".repeat(40),
    rollbackTarget: "b".repeat(40),
    status: "OFFERED",
    baseline: { errors_per_minute: 4 },
    policy: null,
    outcome: null,
    wakeAt: null,
    createdAt: "2026-11-16T12:00:00Z",
    updatedAt: "2026-11-16T12:00:00Z",
    finishedAt: null,
    deployment: null,
    rollback: null,
    verification: null,
    ...over,
  };
}

describe("who may answer", () => {
  it("lets an admin answer anything and an engineer only non-production", () => {
    expect(canAnswer("ADMIN", "ADMIN")).toBe(true);
    expect(canAnswer("ENGINEER", "ENGINEER")).toBe(true);
    expect(canAnswer("ENGINEER", "ADMIN")).toBe(false);
    expect(canAnswer("VIEWER", "ENGINEER")).toBe(false);
    expect(canAnswer(null, "ENGINEER")).toBe(false);
  });

  it("asks an admin for anything that looks like production", () => {
    expect(approverFor("production")).toBe("ADMIN");
    expect(approverFor("eu-prod")).toBe("ADMIN");
    expect(approverFor("staging")).toBe("ENGINEER");
  });
});

describe("status", () => {
  it("names every status and keeps asking while a run is active", () => {
    expect(statusLabel("AWAITING_DECISION")).toEqual({ label: "Waiting for your decision", tone: "ask" });
    expect(statusLabel("FAILED").tone).toBe("bad");
    expect(anyActive([remediation({ status: "VERIFIED" }), remediation({ status: "VERIFYING" })])).toBe(true);
    expect(anyActive([remediation({ status: "VERIFIED" }), remediation({ status: "OFFERED" })])).toBe(false);
    expect(anyActive(undefined)).toBe(false);
  });

  it("shortens a commit", () => {
    expect(shortSha("c".repeat(40))).toBe("ccccccc");
    expect(shortSha(null)).toBe("");
  });
});

describe("links", () => {
  it("only follows https links to GitHub", () => {
    expect(isSafeRunUrl("https://github.com/acme/shop/actions/runs/1")).toBe(true);
    expect(isSafeRunUrl("http://github.com/x")).toBe(false);
    expect(isSafeRunUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeRunUrl("https://github.com.evil.io/x")).toBe(false);
    expect(isSafeRunUrl(null)).toBe(false);
  });
});

describe("countdown", () => {
  const now = Date.parse("2026-11-16T12:00:00Z");
  it("counts down and never goes negative", () => {
    expect(countdown("2026-11-16T12:01:05Z", now)).toBe("1m 05s");
    expect(countdown("2026-11-16T11:59:00Z", now)).toBe("0m 00s");
  });
  it("says nothing without a timer or with a bad one", () => {
    expect(countdown(null, now)).toBeNull();
    expect(countdown("not a date", now)).toBeNull();
  });
});

describe("before and now", () => {
  it("draws two comparable bars", () => {
    const bars = compare(
      remediation({ verification: { kind: "deploy", verdict: "healthy", windowEnd: "", createdAt: "", numbers: { baselineErrorsPerMinute: 4, errorsPerMinute: 1 } } })
    );
    expect(bars).toEqual({ before: 4, after: 1, beforeWidth: 100, afterWidth: 25 });
  });

  it("falls back to the stored baseline and is empty before there is a verdict", () => {
    expect(compare(remediation())).toBeNull();
    const none = remediation({ baseline: null });
    expect(compare(none)).toBeNull();
  });

  it("does not divide by zero when both are zero", () => {
    const bars = compare(
      remediation({ verification: { kind: "deploy", verdict: "healthy", windowEnd: "", createdAt: "", numbers: { baselineErrorsPerMinute: 0, errorsPerMinute: 0 } } })
    );
    expect(bars?.beforeWidth).toBe(0);
    expect(bars?.afterWidth).toBe(0);
  });
});

describe("messages", () => {
  const http = (status: number, detail?: unknown) => ({ response: { status, data: { detail } } });

  it("shows the service reason for a conflict, but not a long or odd one", () => {
    expect(remediationErrorMessage(http(409, "No earlier release of this environment is known, so there is nothing to roll back to"))).toContain("nothing to roll back to");
    expect(remediationErrorMessage(http(409, "x".repeat(500)))).toBe("This was already answered, or is no longer waiting.");
    expect(remediationErrorMessage(http(403))).toBe("Your role cannot answer this.");
    expect(remediationErrorMessage(new Error("network"))).toBe("Could not send your answer. Try again.");
  });

  it("explains why a run ended badly", () => {
    expect(failureReason(remediation({ status: "FAILED", outcome: { failed: "the pipeline run failed" } }))).toBe("the pipeline run failed");
    expect(failureReason(remediation({ outcome: { refused: ["frozen", "no checks"] } }))).toBe("frozen; no checks");
    expect(failureReason(remediation({ status: "FAILED" }))).toBe("The deploy did not complete.");
    expect(failureReason(remediation({ status: "VERIFIED" }))).toBeNull();
  });
});
