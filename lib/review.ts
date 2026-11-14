// The review gate: find the review that is waiting, check the engineer's answer, explain failures.
// Pure functions; mirrors the service's rules (a refine needs a note of at least 3 characters, 1000 at most).

import type {
  ConfidenceBand,
  ResumeInvestigationRequest,
  ReviewAction,
  StreamEvent,
} from "@/types/investigation";

export const MIN_NOTE_LENGTH = 3;
export const MAX_NOTE_LENGTH = 1000;

export interface PendingReview {
  round: number;
  refinesLeft: number;
  rootCause: string;
  confidenceBand: ConfidenceBand | null;
  evidenceIds: string[];
  recommendation: string | null;
  seq: number;
}

/**
 * The review that is waiting for an answer: the latest `review.requested`, unless a `review.decided`
 * came after it. Null when nothing is waiting.
 */
export function pendingReview(events: StreamEvent[]): PendingReview | null {
  let requested: StreamEvent | null = null;
  for (const event of events) {
    if (event.type === "review.requested") requested = event;
    else if (event.type === "review.decided" && requested) requested = null;
  }
  if (!requested) return null;
  const p = requested.payload as unknown as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const band = p.confidenceBand;
  return {
    round: typeof p.round === "number" ? p.round : 1,
    refinesLeft: typeof p.refinesLeft === "number" ? p.refinesLeft : 0,
    rootCause: str(p.rootCause),
    confidenceBand:
      band === "high" || band === "medium" || band === "low" ? band : null,
    evidenceIds: Array.isArray(p.evidenceIds)
      ? p.evidenceIds.filter((id): id is string => typeof id === "string")
      : [],
    recommendation: str(p.recommendation) || null,
    seq: requested.seq,
  };
}

/** Why the answer cannot be sent, or null when it can. */
export function validateDecision(
  action: ReviewAction,
  note: string,
  review: Pick<PendingReview, "refinesLeft">
): string | null {
  if (action !== "refine") return null;
  if (review.refinesLeft <= 0) return "No refinements left for this review.";
  const trimmed = note.trim();
  if (trimmed.length < MIN_NOTE_LENGTH)
    return `Say what to look at differently (at least ${MIN_NOTE_LENGTH} characters).`;
  if (trimmed.length > MAX_NOTE_LENGTH)
    return `Keep the note under ${MAX_NOTE_LENGTH} characters.`;
  return null;
}

/** The request body for an answer: only a refine carries its note. */
export function buildDecision(
  action: ReviewAction,
  note: string
): ResumeInvestigationRequest {
  return action === "refine" ? { action, note: note.trim() } : { action };
}

export function decisionErrorMessage(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  switch (status) {
    case 409:
      return "This review was already answered.";
    case 403:
      return "Your role cannot answer reviews.";
    case 422:
      return "The note was not accepted. Check its length.";
    case 503:
      return "The answer could not be recorded. Try again.";
    default:
      return "Could not send your answer. Try again.";
  }
}
