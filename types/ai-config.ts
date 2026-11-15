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
  /** log0 may open draft pull requests here (needs an installation of the GitHub App). */
  prWritesEnabled: boolean;
  installationId: number | null;
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

export interface GithubAppStatus {
  configured: boolean;
  /** The server-wide switch for writing to repositories. */
  writesEnabled: boolean;
  installUrl: string | null;
}

export interface GithubInstallation {
  installationId: number;
  accountLogin: string;
  accountType: string;
  suspended: boolean;
  createdAt: string;
}

export interface LinkInstallationInput {
  installationId: number;
  state: string;
}

export interface PrPolicyInput {
  onlyOnGreen: boolean;
  /** Run the repository's tests in log0's sandbox when it has no checks of its own. */
  sandboxTests: boolean;
  maxFiles: number | null;
  maxChangedLines: number | null;
  maxPerRepositoryPerHour: number | null;
  maxPerTenantPerHour: number | null;
}

/** The workspace's pull request rules, and the server's limits they can only tighten. */
export interface PrPolicy extends PrPolicyInput {
  server: {
    maxFiles: number;
    maxChangedLines: number;
    maxPerRepositoryPerHour: number;
    maxPerTenantPerHour: number;
  };
  serverOnlyOnGreen: boolean;
  /** The server has a test sandbox a workspace can opt in to. */
  serverSandboxAvailable: boolean;
}
