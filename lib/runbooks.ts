import {
  MAX_RUNBOOK_CHARS,
  MAX_RUNBOOK_TITLE,
  type RunbookInput,
} from "@/types/runbook";

/** Null when the form can be sent, otherwise what to tell the user. */
export function validateRunbook(input: RunbookInput): string | null {
  const title = input.title.trim();
  if (!title) return "Give the runbook a title";
  if (title.length > MAX_RUNBOOK_TITLE)
    return `Keep the title under ${MAX_RUNBOOK_TITLE} characters`;
  // the service rejects control characters in a title
  if (/[\u0000-\u001f\u007f]/.test(title))
    return "The title must be plain text";
  if (!input.markdown.trim()) return "Add the runbook text";
  if (input.markdown.length > MAX_RUNBOOK_CHARS)
    return "Too long: split it into several runbooks";
  return null;
}

/** A title from a file name: "db-pool.md" becomes "db pool". */
export function titleFromFilename(name: string): string {
  return name
    .replace(/\.(md|markdown|txt)$/i, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .slice(0, MAX_RUNBOOK_TITLE);
}

export function buildRunbook(input: RunbookInput): RunbookInput {
  return { title: input.title.trim(), markdown: input.markdown };
}
