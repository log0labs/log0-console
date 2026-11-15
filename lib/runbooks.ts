import {
  MAX_RUNBOOK_CHARS,
  MAX_RUNBOOK_FILE_BYTES,
  MAX_RUNBOOK_TITLE,
  type RunbookInput,
  type RunbookKind,
} from "@/types/runbook";

/** A file the form can take, by its extension; null when it is not a runbook format. */
export function classifyFile(name: string): RunbookKind | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "md" || ext === "markdown") return "markdown";
  if (ext === "txt") return "text";
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  return null;
}

/** Null when the form can be sent, otherwise what to tell the user. */
export function validateRunbook(input: RunbookInput): string | null {
  const title = input.title.trim();
  if (!title) return "Give the runbook a title";
  if (title.length > MAX_RUNBOOK_TITLE)
    return `Keep the title under ${MAX_RUNBOOK_TITLE} characters`;
  // the service rejects control characters in a title
  if (/[\u0000-\u001f\u007f]/.test(title))
    return "The title must be plain text";
  if (input.fileBase64 !== undefined) {
    if (!input.fileType) return "Unknown file type";
    // base64 is 4 bytes of text per 3 bytes of file
    if ((input.fileBase64.length * 3) / 4 > MAX_RUNBOOK_FILE_BYTES)
      return "That file is over 5 MB";
    return null;
  }
  const text = input.markdown ?? "";
  if (!text.trim()) return "Add the runbook text";
  if (text.length > MAX_RUNBOOK_CHARS)
    return "Too long: split it into several runbooks";
  return null;
}

/** A title from a file name: "db-pool.md" becomes "db pool". */
export function titleFromFilename(name: string): string {
  return name
    .replace(/\.(md|markdown|txt|pdf|docx)$/i, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .slice(0, MAX_RUNBOOK_TITLE);
}

export function buildRunbook(input: RunbookInput): RunbookInput {
  return { ...input, title: input.title.trim() };
}

const EXTENSION: Record<RunbookKind, string> = {
  markdown: "md",
  text: "txt",
  pdf: "pdf",
  docx: "docx",
};

/** A safe file name for downloading a runbook: "Database pool" as markdown is "Database pool.md". */
export function downloadName(title: string, kind: RunbookKind): string {
  const base =
    title
      .replace(/[\/:*?"<>|\u0000-\u001f]/g, "")
      .trim()
      .slice(0, 100) || "runbook";
  return `${base}.${EXTENSION[kind]}`;
}

/** The base64 of a file's bytes, without the data-URL prefix. */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const url = String(reader.result);
      resolve(url.slice(url.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}
