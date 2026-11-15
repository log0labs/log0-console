import { describe, expect, it } from "vitest";
import {
  buildRequest,
  DEFAULT_SCOPE,
  MAX_QUESTION_LENGTH,
  SCOPE_OPTIONS,
  startErrorMessage,
  validateForm,
} from "@/lib/investigation-form";

describe("buildRequest", () => {
  it("trims the question and sends null when it is blank", () => {
    expect(buildRequest("  why 500s?  ", DEFAULT_SCOPE).question).toBe(
      "why 500s?"
    );
    expect(buildRequest("   ", DEFAULT_SCOPE).question).toBeNull();
    expect(buildRequest("", DEFAULT_SCOPE).question).toBeNull();
  });

  it("passes the scope through", () => {
    const scope = { ...DEFAULT_SCOPE, code: false };
    expect(buildRequest("", scope).scope).toEqual(scope);
  });
});

describe("validateForm", () => {
  it("accepts the default form and an empty question", () => {
    expect(validateForm("", DEFAULT_SCOPE)).toBeNull();
  });

  it("rejects a scope with every source off", () => {
    const none = {
      logs: false,
      history: false,
      code: false,
      runbooks: false,
      docs: false,
    };
    expect(validateForm("", none)).toMatch(/at least one/i);
  });

  it("rejects a too-long question, measured after trimming", () => {
    expect(
      validateForm("x".repeat(MAX_QUESTION_LENGTH + 1), DEFAULT_SCOPE)
    ).toMatch(/under/);
    expect(
      validateForm(` ${"x".repeat(MAX_QUESTION_LENGTH)} `, DEFAULT_SCOPE)
    ).toBeNull();
  });
});

describe("startErrorMessage", () => {
  const withStatus = (status: number) => ({ response: { status } });

  it("explains the statuses the service uses", () => {
    expect(startErrorMessage(withStatus(409))).toMatch(/already running/);
    expect(startErrorMessage(withStatus(403))).toMatch(/role/);
    expect(startErrorMessage(withStatus(404))).toMatch(/not found/);
  });

  it("falls back for anything else, including non-axios errors", () => {
    expect(startErrorMessage(withStatus(500))).toMatch(/Try again/);
    expect(startErrorMessage(new Error("network"))).toMatch(/Try again/);
    expect(startErrorMessage(undefined)).toMatch(/Try again/);
  });
});

describe("SCOPE_OPTIONS", () => {
  it("covers every scope flag exactly once", () => {
    expect(SCOPE_OPTIONS.map((o) => o.key).sort()).toEqual(
      Object.keys(DEFAULT_SCOPE).sort()
    );
  });
});
