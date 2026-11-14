// Shapes of the ai-service's runbook API (camelCase JSON).

export interface Runbook {
  id: string;
  title: string;
  chunkCount: number;
  embeddingModel: string;
  createdAt: string;
}

export interface RunbookInput {
  title: string;
  markdown: string;
}

export const MAX_RUNBOOK_CHARS = 200_000;
export const MAX_RUNBOOK_TITLE = 200;
