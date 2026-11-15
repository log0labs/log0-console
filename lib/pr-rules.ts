// The workspace's pull request rules: turn form text into the request, and check it before it is sent.
// Pure functions. The server's limits are ceilings: a workspace can only be stricter.

import type { PrPolicy, PrPolicyInput } from "@/types/ai-config";

export type RuleField =
  | "maxFiles"
  | "maxChangedLines"
  | "maxPerRepositoryPerHour"
  | "maxPerTenantPerHour";

export const RULE_FIELDS: { key: RuleField; label: string }[] = [
  { key: "maxFiles", label: "Files per pull request" },
  { key: "maxChangedLines", label: "Changed lines per pull request" },
  { key: "maxPerRepositoryPerHour", label: "Per repository, per hour" },
  { key: "maxPerTenantPerHour", label: "Per workspace, per hour" },
];

/** What the form holds: text for each limit (empty means "the server's value") and the checkbox. */
export interface RulesForm {
  onlyOnGreen: boolean;
  sandboxTests: boolean;
  values: Record<RuleField, string>;
}

export function formFromPolicy(policy: PrPolicy): RulesForm {
  const text = (n: number | null) => (n === null ? "" : String(n));
  return {
    onlyOnGreen: policy.onlyOnGreen || policy.serverOnlyOnGreen,
    sandboxTests: policy.sandboxTests && policy.serverSandboxAvailable,
    values: {
      maxFiles: text(policy.maxFiles),
      maxChangedLines: text(policy.maxChangedLines),
      maxPerRepositoryPerHour: text(policy.maxPerRepositoryPerHour),
      maxPerTenantPerHour: text(policy.maxPerTenantPerHour),
    },
  };
}

/** Why the form cannot be saved, or null. */
export function validateRules(form: RulesForm, policy: PrPolicy): string | null {
  for (const { key, label } of RULE_FIELDS) {
    const raw = form.values[key].trim();
    if (raw === "") continue;
    if (!/^\d+$/.test(raw) || Number(raw) < 1)
      return `${label}: use a whole number of at least 1.`;
    if (Number(raw) > policy.server[key])
      return `${label}: the server allows at most ${policy.server[key]}.`;
  }
  return null;
}

export function buildRules(form: RulesForm): PrPolicyInput {
  const num = (raw: string) => (raw.trim() === "" ? null : Number(raw));
  return {
    onlyOnGreen: form.onlyOnGreen,
    sandboxTests: form.sandboxTests,
    maxFiles: num(form.values.maxFiles),
    maxChangedLines: num(form.values.maxChangedLines),
    maxPerRepositoryPerHour: num(form.values.maxPerRepositoryPerHour),
    maxPerTenantPerHour: num(form.values.maxPerTenantPerHour),
  };
}

export function sameRules(a: RulesForm, b: RulesForm): boolean {
  return (
    a.onlyOnGreen === b.onlyOnGreen &&
    a.sandboxTests === b.sandboxTests &&
    RULE_FIELDS.every(({ key }) => a.values[key].trim() === b.values[key].trim())
  );
}
