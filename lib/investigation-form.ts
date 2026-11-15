// Pure helpers for starting an investigation: turn the form into a request and a failure into a message.

import type {
  CreateInvestigationRequest,
  InvestigationScope,
} from "@/types/investigation";

export const MAX_QUESTION_LENGTH = 2000;

export const DEFAULT_SCOPE: InvestigationScope = {
  logs: true,
  history: true,
  code: true,
  runbooks: true,
  docs: true,
};

export const SCOPE_OPTIONS: {
  key: keyof InvestigationScope;
  label: string;
  hint: string;
}[] = [
  { key: "logs", label: "Logs", hint: "Search this incident's log events" },
  { key: "history", label: "History", hint: "Compare with past incidents" },
  { key: "code", label: "Code", hint: "Read the linked repository" },
  { key: "runbooks", label: "Runbooks", hint: "Use your team's runbooks" },
  { key: "docs", label: "Docs", hint: "Use your team's documents" },
];

/** The request body for the form values (the incident id is added by the hook). */
export function buildRequest(
  question: string,
  scope: InvestigationScope
): Omit<CreateInvestigationRequest, "incidentId"> {
  const trimmed = question.trim();
  return { question: trimmed === "" ? null : trimmed, scope };
}

/** Why the form cannot be submitted, or null when it can. */
export function validateForm(
  question: string,
  scope: InvestigationScope
): string | null {
  if (question.trim().length > MAX_QUESTION_LENGTH)
    return `Keep the question under ${MAX_QUESTION_LENGTH} characters.`;
  if (!Object.values(scope).some(Boolean))
    return "Pick at least one source to investigate.";
  return null;
}

/** A readable message for a failed API call; `error` is whatever the call threw. */
export function startErrorMessage(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  switch (status) {
    case 409:
      return "An investigation is already running for this incident.";
    case 403:
      return "Your role cannot start investigations.";
    case 404:
      return "This incident was not found.";
    default:
      return "Could not start the investigation. Try again.";
  }
}
