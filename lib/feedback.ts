// An engineer's verdict on a finished investigation. It feeds the service's long-term memory:
// "wrong" results are never recalled again, "helpful" ones rank higher.

export type FeedbackVerdict = "helpful" | "partly" | "wrong";

export const FEEDBACK_OPTIONS: { value: FeedbackVerdict; label: string }[] = [
  { value: "helpful", label: "Helpful" },
  { value: "partly", label: "Partly" },
  { value: "wrong", label: "Wrong" },
];

export const MAX_FEEDBACK_NOTE = 1000;

export interface FeedbackRequest {
  verdict: FeedbackVerdict;
  note?: string | null;
}

/** Null when fine, otherwise what to tell the user. */
export function validateFeedback(note: string): string | null {
  return note.trim().length > MAX_FEEDBACK_NOTE
    ? `Keep the note under ${MAX_FEEDBACK_NOTE} characters`
    : null;
}

export function buildFeedback(
  verdict: FeedbackVerdict,
  note: string
): FeedbackRequest {
  const trimmed = note.trim();
  return { verdict, note: trimmed === "" ? null : trimmed };
}

const storageKey = (investigationId: string) => `feedback:${investigationId}`;

/** The verdict this browser already sent, so the bar can say thanks instead of asking again. */
export function readSentVerdict(
  investigationId: string
): FeedbackVerdict | null {
  try {
    const value = window.localStorage.getItem(storageKey(investigationId));
    return FEEDBACK_OPTIONS.some((o) => o.value === value)
      ? (value as FeedbackVerdict)
      : null;
  } catch {
    return null;
  }
}

export function rememberVerdict(
  investigationId: string,
  verdict: FeedbackVerdict
): void {
  try {
    window.localStorage.setItem(storageKey(investigationId), verdict);
  } catch {
    /* storage can be blocked: the bar then simply asks again */
  }
}
