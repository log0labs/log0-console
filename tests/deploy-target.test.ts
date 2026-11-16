import { describe, expect, it } from "vitest";

import {
  buildConfig,
  emptyForm,
  formFromConfig,
  newEnvironment,
  sameForm,
  summary,
  validateTarget,
  type DeployTargetConfig,
  type TargetForm,
} from "@/lib/deploy-target";

const config: DeployTargetConfig = {
  workflowFile: "deploy.yml",
  environments: [
    {
      name: "staging",
      enabled: true,
      approver: "ENGINEER",
      requiresPreviousVerified: false,
      soakSeconds: 600,
      deployTimeoutSeconds: 1200,
      autoRollback: false,
      freezeWindows: [{ days: [4], startHour: 12, endHour: 18 }],
      thresholds: { improvementMargin: 0.4, minTraffic: 250, newErrorPerMinute: 8, graceSeconds: 240 },
    },
    {
      name: "production",
      enabled: false,
      approver: "ADMIN",
      requiresPreviousVerified: true,
      soakSeconds: 900,
      deployTimeoutSeconds: 1200,
      autoRollback: false,
      freezeWindows: [],
      thresholds: { improvementMargin: 0.5, minTraffic: 100, newErrorPerMinute: 5, graceSeconds: 120 },
    },
  ],
};

function form(over: Partial<TargetForm> = {}): TargetForm {
  return { ...formFromConfig(config), ...over };
}

describe("the form and the config", () => {
  it("shows minutes and percent and gives them back as seconds and a fraction", () => {
    const f = formFromConfig(config);
    expect(f.environments[0]).toMatchObject({ soakMinutes: "10", timeoutMinutes: "20", minTraffic: "250", marginPercent: "40" });
    expect(buildConfig(f, config)).toEqual(config);
  });

  it("keeps what the form does not edit: freeze windows, the other thresholds, auto-rollback", () => {
    const f = form();
    f.environments[0] = { ...f.environments[0], minTraffic: "300", marginPercent: "60" };

    const built = buildConfig(f, config).environments[0];

    expect(built.freezeWindows).toEqual(config.environments[0].freezeWindows);
    expect(built.thresholds).toEqual({ improvementMargin: 0.6, minTraffic: 300, newErrorPerMinute: 8, graceSeconds: 240 });
    expect(built.autoRollback).toBe(false);
  });

  it("gives a new environment the safe defaults, switched off", () => {
    const built = buildConfig({ workflowFile: "deploy.yml", environments: [newEnvironment("staging")] }, null).environments[0];

    expect(built).toMatchObject({ enabled: false, approver: "ENGINEER", soakSeconds: 900, deployTimeoutSeconds: 1200, autoRollback: false, freezeWindows: [] });
    expect(built.thresholds).toEqual({ improvementMargin: 0.5, minTraffic: 100, newErrorPerMinute: 5, graceSeconds: 120 });
  });

  it("starts a new setup with one production environment that needs an admin", () => {
    expect(emptyForm().environments[0]).toMatchObject({ name: "production", approver: "ADMIN", enabled: false });
  });

  it("tells a changed form from an untouched one", () => {
    expect(sameForm(form(), form())).toBe(true);
    expect(sameForm(form(), form({ workflowFile: "release.yml" }))).toBe(false);
  });
});

describe("validation", () => {
  it("accepts what it built", () => {
    expect(validateTarget(form(), config)).toBeNull();
    expect(validateTarget(emptyForm(), null)).toBeNull();
  });

  it.each(["../deploy.yml", "deploy", "deploy.sh", "my deploy.yml", "", "dir/deploy.yml"])("refuses the workflow %j", (workflowFile) => {
    expect(validateTarget(form({ workflowFile }), config)).toMatch(/file name/);
  });

  it("refuses bad, repeated and too many environment names", () => {
    const named = (...names: string[]) => form({ environments: names.map((n) => newEnvironment(n)) });
    expect(validateTarget(named("Staging"), null)).toMatch(/lowercase/);
    expect(validateTarget(named("a b"), null)).toMatch(/lowercase/);
    expect(validateTarget(named("staging", "staging"), null)).toMatch(/unique/);
    expect(validateTarget(named("a", "b", "c", "d", "e", "f"), null)).toMatch(/At most 5/);
    expect(validateTarget(form({ environments: [] }), null)).toMatch(/at least one/);
  });

  it("makes production-looking environments admin only", () => {
    const f = form();
    f.environments[1] = { ...f.environments[1], approver: "ENGINEER" };
    expect(validateTarget(f, config)).toMatch(/production needs an admin/);
  });

  it("does not let the first environment wait for a previous one", () => {
    const f = form();
    f.environments[0] = { ...f.environments[0], requiresPreviousVerified: true };
    expect(validateTarget(f, config)).toMatch(/no previous one/);
  });

  it("checks the numbers and that the soak outlasts the grace period", () => {
    const withEnv = (patch: Partial<TargetForm["environments"][number]>) => {
      const f = form();
      f.environments[0] = { ...f.environments[0], ...patch };
      return validateTarget(f, config);
    };
    expect(withEnv({ soakMinutes: "0" })).toMatch(/soak is 1 to 120/);
    expect(withEnv({ soakMinutes: "abc" })).toMatch(/soak is 1 to 120/);
    expect(withEnv({ soakMinutes: "4" })).toMatch(/outlast the 4 minute grace/); // grace is 240 s: 4 minutes is not enough
    expect(withEnv({ soakMinutes: "5" })).toBeNull();
    expect(withEnv({ timeoutMinutes: "121" })).toMatch(/timeout/);
    expect(withEnv({ minTraffic: "0" })).toMatch(/minimum traffic/);
    expect(withEnv({ marginPercent: "100" })).toMatch(/margin/);
    expect(withEnv({ marginPercent: "0" })).toMatch(/margin/);
  });
});

describe("summary", () => {
  it("says what is switched on", () => {
    expect(summary(null)).toMatch(/Not set up/);
    expect(summary(config)).toBe("Deploys on: staging");
    expect(summary({ ...config, environments: config.environments.map((e) => ({ ...e, enabled: false })) })).toMatch(/switched off/);
  });
});
