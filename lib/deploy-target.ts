// How a repository is deployed: turn the editor's text fields into the request, and check them before it is sent.
// Pure functions. The limits come from the service (`GET /deploy-targets/rules`); DEFAULT_RULES is only the fallback
// for when that cannot be read. The server validates again and has the last word.

import type { Approver } from "@/types/remediation";

export interface Thresholds {
  improvementMargin: number;
  minTraffic: number;
  newErrorPerMinute: number;
  graceSeconds: number;
}

/** Hours (UTC) on some weekdays (0 is Monday) in which log0 does not deploy. */
export interface FreezeWindow {
  days: number[];
  startHour: number;
  endHour: number;
}

export interface EnvironmentRule {
  name: string;
  enabled: boolean;
  approver: Approver;
  requiresPreviousVerified: boolean;
  soakSeconds: number;
  deployTimeoutSeconds: number;
  autoRollback: boolean;
  freezeWindows: FreezeWindow[];
  thresholds: Thresholds;
}

export interface DeployTargetConfig {
  workflowFile: string;
  environments: EnvironmentRule[];
}

export interface DeployTarget {
  repositoryId: string;
  config: DeployTargetConfig;
  updatedAt: string;
}

export interface FreezeForm {
  days: number[];
  startHour: string;
  endHour: string;
}

export interface EnvironmentForm {
  name: string;
  enabled: boolean;
  approver: Approver;
  requiresPreviousVerified: boolean;
  soakMinutes: string;
  timeoutMinutes: string;
  minTraffic: string;
  marginPercent: string;
  freezeWindows: FreezeForm[];
}

export interface TargetForm {
  workflowFile: string;
  environments: EnvironmentForm[];
}

/** A range as the service declares it: inclusive (`ge`, `le`) or exclusive (`gt`, `lt`). */
export interface Bounds {
  ge?: number;
  gt?: number;
  le?: number;
  lt?: number;
}

/** What a configuration may contain, as published by the service. */
export interface Rules {
  workflowPattern: string;
  namePattern: string;
  maxEnvironments: number;
  productionHint: string;
  soakAfterGraceSeconds: number;
  soakSeconds: Bounds;
  deployTimeoutSeconds: Bounds;
  graceSeconds: Bounds;
  minTraffic: Bounds;
  improvementMargin: Bounds;
  newErrorPerMinute: Bounds;
}

export const DEFAULT_RULES: Rules = {
  workflowPattern: "^[A-Za-z0-9][A-Za-z0-9_.-]{0,100}\\.ya?ml$",
  namePattern: "^[a-z0-9][a-z0-9-]{0,62}$",
  maxEnvironments: 5,
  productionHint: "prod",
  soakAfterGraceSeconds: 60,
  soakSeconds: { ge: 60, le: 7200 },
  deployTimeoutSeconds: { ge: 60, le: 7200 },
  graceSeconds: { ge: 0, le: 1800 },
  minTraffic: { ge: 1, le: 10_000_000 },
  improvementMargin: { gt: 0, lt: 1 },
  newErrorPerMinute: { gt: 0, le: 100_000 },
};

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const MAX_FREEZE_WINDOWS = 7;

const DEFAULT_THRESHOLDS: Thresholds = {
  improvementMargin: 0.5,
  minTraffic: 100,
  newErrorPerMinute: 5,
  graceSeconds: 120,
};

export function inBounds(value: number, bounds: Bounds): boolean {
  if (!Number.isFinite(value)) return false;
  return (
    (bounds.ge === undefined || value >= bounds.ge) &&
    (bounds.gt === undefined || value > bounds.gt) &&
    (bounds.le === undefined || value <= bounds.le) &&
    (bounds.lt === undefined || value < bounds.lt)
  );
}

export function newEnvironment(name = "", rules: Rules = DEFAULT_RULES): EnvironmentForm {
  return {
    name,
    enabled: false,
    approver: name.includes(rules.productionHint) ? "ADMIN" : "ENGINEER",
    requiresPreviousVerified: false,
    soakMinutes: "15",
    timeoutMinutes: "20",
    minTraffic: String(DEFAULT_THRESHOLDS.minTraffic),
    marginPercent: String(DEFAULT_THRESHOLDS.improvementMargin * 100),
    freezeWindows: [],
  };
}

export function newFreezeWindow(): FreezeForm {
  return { days: [4], startHour: "12", endHour: "18" };
}

export function emptyForm(): TargetForm {
  return { workflowFile: "deploy.yml", environments: [newEnvironment("production")] };
}

export function formFromConfig(config: DeployTargetConfig): TargetForm {
  return {
    workflowFile: config.workflowFile,
    environments: config.environments.map((rule) => ({
      name: rule.name,
      enabled: rule.enabled,
      approver: rule.approver,
      requiresPreviousVerified: rule.requiresPreviousVerified,
      soakMinutes: String(rule.soakSeconds / 60),
      timeoutMinutes: String(rule.deployTimeoutSeconds / 60),
      minTraffic: String(rule.thresholds.minTraffic),
      marginPercent: String(Math.round(rule.thresholds.improvementMargin * 100)),
      freezeWindows: rule.freezeWindows.map((w) => ({ days: [...w.days], startHour: String(w.startHour), endHour: String(w.endHour) })),
    })),
  };
}

const whole = (raw: string) => (/^\d+$/.test(raw.trim()) ? Number(raw.trim()) : NaN);

function freezeProblem(name: string, windows: FreezeForm[]): string | null {
  if (windows.length > MAX_FREEZE_WINDOWS) return `${name}: at most ${MAX_FREEZE_WINDOWS} freeze windows.`;
  for (const w of windows) {
    if (w.days.length === 0) return `${name}: a freeze window needs at least one day.`;
    const start = whole(w.startHour);
    const end = whole(w.endHour);
    if (!(start >= 0 && start <= 23)) return `${name}: a freeze window starts at an hour from 0 to 23.`;
    if (!(end >= 1 && end <= 24)) return `${name}: a freeze window ends at an hour from 1 to 24.`;
    if (start >= end) return `${name}: a freeze window ends after it starts, within one day (use two windows to cross midnight).`;
  }
  return null;
}

/** Why the form cannot be saved, or null. `original` supplies the grace period the soak must outlast. */
export function validateTarget(form: TargetForm, original?: DeployTargetConfig | null, rules: Rules = DEFAULT_RULES): string | null {
  if (!new RegExp(rules.workflowPattern).test(form.workflowFile.trim())) {
    return "The workflow is a file name such as deploy.yml (no folders, no spaces).";
  }
  const { environments } = form;
  if (environments.length < 1) return "Add at least one environment.";
  if (environments.length > rules.maxEnvironments) return `At most ${rules.maxEnvironments} environments.`;
  const names = environments.map((e) => e.name.trim());
  if (new Set(names).size !== names.length) return "Environment names must be unique.";
  const namePattern = new RegExp(rules.namePattern);
  for (const [index, env] of environments.entries()) {
    const name = env.name.trim();
    if (!namePattern.test(name)) return `"${name}": use lowercase letters, digits and dashes.`;
    if (name.includes(rules.productionHint) && env.approver !== "ADMIN") return `${name}: production needs an admin to approve.`;
    if (index === 0 && env.requiresPreviousVerified) return `${name}: the first environment has no previous one to wait for.`;
    const soak = whole(env.soakMinutes);
    const timeout = whole(env.timeoutMinutes);
    const grace = original?.environments.find((e) => e.name === name)?.thresholds.graceSeconds ?? DEFAULT_THRESHOLDS.graceSeconds;
    if (!inBounds(soak * 60, rules.soakSeconds)) return `${name}: the soak is ${(rules.soakSeconds.ge ?? 60) / 60} to ${(rules.soakSeconds.le ?? 7200) / 60} minutes.`;
    if (soak * 60 < grace + rules.soakAfterGraceSeconds) return `${name}: the soak must outlast the ${grace / 60} minute grace period by a minute.`;
    if (!inBounds(timeout * 60, rules.deployTimeoutSeconds)) return `${name}: the deploy timeout is ${(rules.deployTimeoutSeconds.ge ?? 60) / 60} to ${(rules.deployTimeoutSeconds.le ?? 7200) / 60} minutes.`;
    if (!inBounds(whole(env.minTraffic), rules.minTraffic)) return `${name}: the minimum traffic is a whole number of at least ${rules.minTraffic.ge ?? 1}.`;
    const margin = whole(env.marginPercent);
    if (!inBounds(margin / 100, rules.improvementMargin)) return `${name}: the margin is 1 to 99 percent.`;
    const freeze = freezeProblem(name, env.freezeWindows);
    if (freeze) return freeze;
  }
  return null;
}

/** The request body. What the form does not edit (auto-rollback, the other thresholds) is kept from `original`. */
export function buildConfig(form: TargetForm, original?: DeployTargetConfig | null): DeployTargetConfig {
  return {
    workflowFile: form.workflowFile.trim(),
    environments: form.environments.map((env) => {
      const name = env.name.trim();
      const before = original?.environments.find((e) => e.name === name);
      return {
        name,
        enabled: env.enabled,
        approver: env.approver,
        requiresPreviousVerified: env.requiresPreviousVerified,
        soakSeconds: Number(env.soakMinutes) * 60,
        deployTimeoutSeconds: Number(env.timeoutMinutes) * 60,
        autoRollback: before?.autoRollback ?? false,
        freezeWindows: env.freezeWindows.map((w) => ({ days: [...w.days].sort((a, b) => a - b), startHour: Number(w.startHour), endHour: Number(w.endHour) })),
        thresholds: {
          ...(before?.thresholds ?? DEFAULT_THRESHOLDS),
          minTraffic: Number(env.minTraffic),
          improvementMargin: Number(env.marginPercent) / 100,
        },
      };
    }),
  };
}

export function sameForm(a: TargetForm, b: TargetForm): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** One line for a closed row: which environments log0 may deploy to. */
export function summary(config: DeployTargetConfig | null): string {
  if (!config) return "Not set up: log0 will not offer deploys here.";
  const on = config.environments.filter((e) => e.enabled).map((e) => e.name);
  return on.length > 0 ? `Deploys on: ${on.join(", ")}` : "Set up, but every environment is switched off.";
}

/** What the installation can do: `missing` maps each permission it still has to accept to the level wanted (empty when it can deploy). */
export interface DeployAccess {
  canDeploy: boolean;
  missing: Record<string, string>;
}

/** "actions (write), deployments (write)": the missing permissions as a sentence part. Tolerates a missing or odd value. */
export function describeMissing(missing: DeployAccess["missing"] | null | undefined): string {
  if (!missing || typeof missing !== "object") return "";
  return Object.entries(missing)
    .map(([name, level]) => `${name} (${level})`)
    .sort()
    .join(", ");
}
