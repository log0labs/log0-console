// How a repository is deployed: turn the editor's text fields into the request, and check them before it is sent.
// Pure functions. The server validates again and has the last word; these checks only save a round trip.

import type { Approver } from "@/types/remediation";

export interface Thresholds {
  improvementMargin: number;
  minTraffic: number;
  newErrorPerMinute: number;
  graceSeconds: number;
}

export interface EnvironmentRule {
  name: string;
  enabled: boolean;
  approver: Approver;
  requiresPreviousVerified: boolean;
  soakSeconds: number;
  deployTimeoutSeconds: number;
  autoRollback: boolean;
  freezeWindows: unknown[];
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

export interface EnvironmentForm {
  name: string;
  enabled: boolean;
  approver: Approver;
  requiresPreviousVerified: boolean;
  soakMinutes: string;
  timeoutMinutes: string;
  minTraffic: string;
  marginPercent: string;
}

export interface TargetForm {
  workflowFile: string;
  environments: EnvironmentForm[];
}

export const MAX_ENVIRONMENTS = 5;
const WORKFLOW_FILE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,100}\.ya?ml$/;
const ENVIRONMENT_NAME = /^[a-z0-9][a-z0-9-]{0,62}$/;
const DEFAULT_THRESHOLDS: Thresholds = {
  improvementMargin: 0.5,
  minTraffic: 100,
  newErrorPerMinute: 5,
  graceSeconds: 120,
};

export function newEnvironment(name = ""): EnvironmentForm {
  return {
    name,
    enabled: false,
    approver: name.includes("prod") ? "ADMIN" : "ENGINEER",
    requiresPreviousVerified: false,
    soakMinutes: "15",
    timeoutMinutes: "20",
    minTraffic: String(DEFAULT_THRESHOLDS.minTraffic),
    marginPercent: String(DEFAULT_THRESHOLDS.improvementMargin * 100),
  };
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
    })),
  };
}

const whole = (raw: string) => (/^\d+$/.test(raw.trim()) ? Number(raw.trim()) : NaN);

/** Why the form cannot be saved, or null. `original` supplies the grace period the soak must outlast. */
export function validateTarget(form: TargetForm, original?: DeployTargetConfig | null): string | null {
  if (!WORKFLOW_FILE.test(form.workflowFile.trim())) {
    return "The workflow is a file name such as deploy.yml (no folders, no spaces).";
  }
  const { environments } = form;
  if (environments.length < 1) return "Add at least one environment.";
  if (environments.length > MAX_ENVIRONMENTS) return `At most ${MAX_ENVIRONMENTS} environments.`;
  const names = environments.map((e) => e.name.trim());
  if (new Set(names).size !== names.length) return "Environment names must be unique.";
  for (const [index, env] of environments.entries()) {
    const name = env.name.trim();
    if (!ENVIRONMENT_NAME.test(name)) return `"${name}": use lowercase letters, digits and dashes.`;
    if (name.includes("prod") && env.approver !== "ADMIN") return `${name}: production needs an admin to approve.`;
    if (index === 0 && env.requiresPreviousVerified) return `${name}: the first environment has no previous one to wait for.`;
    const soak = whole(env.soakMinutes);
    const timeout = whole(env.timeoutMinutes);
    const grace = original?.environments.find((e) => e.name === name)?.thresholds.graceSeconds ?? DEFAULT_THRESHOLDS.graceSeconds;
    if (!(soak >= 1 && soak <= 120)) return `${name}: the soak is 1 to 120 minutes.`;
    if (soak * 60 < grace + 60) return `${name}: the soak must outlast the ${grace / 60} minute grace period by a minute.`;
    if (!(timeout >= 1 && timeout <= 120)) return `${name}: the deploy timeout is 1 to 120 minutes.`;
    const traffic = whole(env.minTraffic);
    if (!(traffic >= 1)) return `${name}: the minimum traffic is a whole number of at least 1.`;
    const margin = whole(env.marginPercent);
    if (!(margin >= 1 && margin <= 99)) return `${name}: the margin is 1 to 99 percent.`;
  }
  return null;
}

/** The request body. What the form does not edit (freeze windows, auto-rollback, the other thresholds) is kept from `original`. */
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
        freezeWindows: before?.freezeWindows ?? [],
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
