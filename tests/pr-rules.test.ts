import { describe, expect, it } from "vitest";

import {
  buildRules,
  formFromPolicy,
  sameRules,
  validateRules,
} from "@/lib/pr-rules";
import type { PrPolicy } from "@/types/ai-config";

const policy = (over: Partial<PrPolicy> = {}): PrPolicy => ({
  onlyOnGreen: false,
  sandboxTests: false,
  maxFiles: null,
  maxChangedLines: null,
  maxPerRepositoryPerHour: null,
  maxPerTenantPerHour: null,
  server: {
    maxFiles: 10,
    maxChangedLines: 400,
    maxPerRepositoryPerHour: 3,
    maxPerTenantPerHour: 10,
  },
  serverOnlyOnGreen: false,
  serverSandboxAvailable: false,
  ...over,
});

describe("the form", () => {
  it("starts empty when the workspace chose nothing and shows what it chose", () => {
    expect(formFromPolicy(policy()).values.maxFiles).toBe("");
    const form = formFromPolicy(policy({ maxFiles: 3, onlyOnGreen: true }));
    expect(form.values.maxFiles).toBe("3");
    expect(form.onlyOnGreen).toBe(true);
  });

  it("shows green-only as on when the server requires it", () => {
    expect(formFromPolicy(policy({ serverOnlyOnGreen: true })).onlyOnGreen).toBe(true);
  });
});

describe("validateRules", () => {
  const form = (maxFiles: string) => ({
    ...formFromPolicy(policy()),
    values: { ...formFromPolicy(policy()).values, maxFiles },
  });

  it("accepts empty values and values within the server limit", () => {
    expect(validateRules(form(""), policy())).toBeNull();
    expect(validateRules(form("10"), policy())).toBeNull();
    expect(validateRules(form(" 2 "), policy())).toBeNull();
  });

  it("refuses zero, negatives, text and anything above the server limit", () => {
    for (const bad of ["0", "-1", "1.5", "abc"]) {
      expect(validateRules(form(bad), policy())).toMatch(/whole number/);
    }
    expect(validateRules(form("11"), policy())).toMatch(/at most 10/);
  });
});

describe("buildRules and sameRules", () => {
  it("sends null for an empty limit and numbers for the rest", () => {
    const base = formFromPolicy(policy());
    const form = { ...base, onlyOnGreen: true, values: { ...base.values, maxFiles: "4" } };
    expect(buildRules(form)).toEqual({
      onlyOnGreen: true,
      sandboxTests: false,
      maxFiles: 4,
      maxChangedLines: null,
      maxPerRepositoryPerHour: null,
      maxPerTenantPerHour: null,
    });
  });

  it("ignores spaces when deciding whether anything changed", () => {
    const base = formFromPolicy(policy({ maxFiles: 3 }));
    expect(sameRules(base, { ...base, values: { ...base.values, maxFiles: " 3 " } })).toBe(true);
    expect(sameRules(base, { ...base, onlyOnGreen: true })).toBe(false);
  });
});

describe("the sandbox switch", () => {
  it("is on only when the workspace chose it and the server has a sandbox", () => {
    expect(formFromPolicy(policy({ sandboxTests: true, serverSandboxAvailable: true })).sandboxTests).toBe(true);
    expect(formFromPolicy(policy({ sandboxTests: true, serverSandboxAvailable: false })).sandboxTests).toBe(false);
  });

  it("counts as a change", () => {
    const base = formFromPolicy(policy());
    expect(sameRules(base, { ...base, sandboxTests: true })).toBe(false);
  });
});
