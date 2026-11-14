// Shapes of the ai-service's settings and repository APIs (camelCase JSON).
// No response ever carries a stored key or token: only the last four characters of a key.

export type Purpose = "summary" | "triage" | "investigation" | "evaluation";

export const PURPOSES: readonly Purpose[] = [
  "summary",
  "triage",
  "investigation",
  "evaluation",
];

export interface AiSetting {
  purpose: Purpose;
  /** "tenant": saved by this workspace. "platform": the default, nothing saved. */
  source: "tenant" | "platform";
  provider: string;
  model: string;
  keyLast4: string | null;
  temperature: number | null;
  maxTokens: number | null;
  updatedAt: string | null;
}

export interface AiSettingInput {
  provider: string;
  model: string;
  /** Sent only when the user typed one: leaving it out keeps the stored key. */
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ConnectionCheck {
  ok: boolean;
  provider: string;
  model: string;
  latencyMs: number;
  /** A short category (auth, model_not_found, ...), never the provider's own message. */
  error: string | null;
}

export interface Repository {
  id: string;
  provider: string;
  owner: string;
  name: string;
  defaultBranch: string;
  createdAt: string;
}

export interface ConnectRepositoryInput {
  owner: string;
  name: string;
  token: string;
}

export interface ServiceRepository {
  serviceName: string;
  repositoryId: string;
  pathPrefix: string;
}
