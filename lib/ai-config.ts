// Pure helpers for the AI settings and repository screens: validate forms, build request bodies,
// explain failures. They mirror the service's own rules (it validates again, these only give quick feedback).

import type {
  AiSettingInput,
  ConnectRepositoryInput,
  Purpose,
} from "@/types/ai-config";

export const PROVIDER_OPTIONS = [
  "groq",
  "openai",
  "anthropic",
  "google_genai",
  "huggingface",
  "openrouter",
] as const;

export const PURPOSE_INFO: Record<Purpose, { label: string; hint: string }> = {
  summary: { label: "Summaries", hint: "Short incident summaries" },
  triage: { label: "Triage", hint: "First look: category and what to gather" },
  investigation: {
    label: "Investigation",
    hint: "The main reasoning: evidence, root cause, code changes",
  },
  evaluation: { label: "Evaluation", hint: "Checking answers against rules" },
};

const MIN_KEY = 8;

export interface SettingForm {
  provider: string;
  model: string;
  apiKey: string;
  temperature: string;
  maxTokens: string;
}

/** Why the form cannot be saved, or null. `hasStoredKey` says a key already exists for this provider. */
export function validateSettingForm(form: SettingForm): string | null {
  if (!(PROVIDER_OPTIONS as readonly string[]).includes(form.provider))
    return "Pick a provider.";
  if (form.model.trim() === "") return "Enter a model name.";
  if (form.model.trim().length > 128) return "The model name is too long.";
  const key = form.apiKey.trim();
  if (key !== "" && key.length < MIN_KEY) return "That API key is too short.";
  if (form.temperature.trim() !== "") {
    const t = Number(form.temperature);
    if (!Number.isFinite(t) || t < 0 || t > 2)
      return "Temperature must be between 0 and 2.";
  }
  if (form.maxTokens.trim() !== "") {
    const n = Number(form.maxTokens);
    if (!Number.isInteger(n) || n < 1 || n > 32000)
      return "Max tokens must be a whole number from 1 to 32000.";
  }
  return null;
}

/** The request body: blank optional fields are left out, so the service keeps its defaults (and the stored key). */
export function buildSettingBody(form: SettingForm): AiSettingInput {
  const body: AiSettingInput = {
    provider: form.provider,
    model: form.model.trim(),
  };
  if (form.apiKey.trim() !== "") body.apiKey = form.apiKey.trim();
  if (form.temperature.trim() !== "")
    body.temperature = Number(form.temperature);
  if (form.maxTokens.trim() !== "") body.maxTokens = Number(form.maxTokens);
  return body;
}

export function validateRepositoryForm(
  form: ConnectRepositoryInput
): string | null {
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(form.owner.trim()))
    return "Owner must be a GitHub user or organization name.";
  const name = form.name.trim();
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(name) || name === "." || name === "..")
    return "Repository name is not valid.";
  if (form.token.trim().length < MIN_KEY) return "Enter the access token.";
  return null;
}

/** The folder of a repository a service lives in: no edge slashes, never climbing out ("" = whole repository). */
export function normalizePathPrefix(value: string): string | null {
  const prefix = value.trim().replace(/^\/+|\/+$/g, "");
  if (prefix.length > 500 || prefix.includes("\\") || prefix.includes("\0"))
    return null;
  if (
    prefix !== "" &&
    prefix.split("/").some((p) => p === "" || p === "." || p === "..")
  )
    return null;
  return prefix;
}

export function validateServiceName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed === "") return "Enter the service name.";
  if (trimmed.length > 255) return "The service name is too long.";
  return null;
}

/** A message for a failed call. The service's own `detail` text is used when it is a plain string (no secrets in it). */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const response = (
    error as { response?: { status?: number; data?: { detail?: unknown } } }
  )?.response;
  const detail = response?.data?.detail;
  if (response?.status === 403) return "Only admins can change this.";
  if (typeof detail === "string" && detail.length > 0 && detail.length < 200)
    return detail;
  if (response?.status === 503)
    return "The server is not able to do this right now.";
  return fallback;
}

const CHECK_ERRORS: Record<string, string> = {
  auth: "The provider rejected the key.",
  model_not_found: "The provider does not have that model.",
  rate_limit: "The provider is rate limiting this key.",
  timeout: "The provider did not answer in time.",
};

export function checkErrorMessage(error: string | null): string {
  if (!error) return "The connection test failed.";
  return CHECK_ERRORS[error] ?? `The connection test failed (${error}).`;
}
