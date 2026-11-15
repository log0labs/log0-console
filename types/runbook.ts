// Shapes of the ai-service's runbook API (camelCase JSON).

export type RunbookKind = "markdown" | "text" | "pdf" | "docx";

export interface Runbook {
  id: string;
  title: string;
  chunkCount: number;
  embeddingModel: string;
  createdAt: string;
  sourceKind: RunbookKind;
}

/** A runbook for the viewer: its text, and whether the uploaded file (PDF or Word) can be fetched. */
export interface RunbookDetail {
  id: string;
  title: string;
  kind: RunbookKind;
  /** The text as uploaded, or the text extracted from the PDF or Word file. */
  text: string;
  hasFile: boolean;
  /** True when the text was rebuilt from the search index (stored before originals were kept). */
  reconstructed: boolean;
}

/** What the upload sends: text (Markdown or plain), or a PDF or Word file as base64. */
export interface RunbookInput {
  title: string;
  markdown?: string;
  format?: "markdown" | "text";
  fileBase64?: string;
  fileType?: "pdf" | "docx";
}

export const MAX_RUNBOOK_CHARS = 200_000;
export const MAX_RUNBOOK_TITLE = 200;
export const MAX_RUNBOOK_FILE_BYTES = 5 * 1024 * 1024;
export const RUNBOOK_FILE_ACCEPT = ".md,.markdown,.txt,.pdf,.docx";
