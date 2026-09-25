import type { RateLimitStatus } from "../connectors/core/connector.types.js";

export const repositorySources = ["github", "gitlab", "codeberg", "gitea", "forgejo"] as const;
export type RepositorySource = (typeof repositorySources)[number];
export type CollectionMode = "preview" | "expanded" | "all";

export interface RepositorySearchFilters {
  language?: string[] | undefined;
  topic?: string[] | undefined;
  starsMin?: number | undefined;
  starsMax?: number | undefined;
  createdAfter?: string | undefined;
  createdBefore?: string | undefined;
  updatedAfter?: string | undefined;
  license?: string[] | undefined;
  archived?: boolean | undefined;
  owner?: string | undefined;
  organization?: string | undefined;
}

export interface RepositorySearchRequest {
  query: string;
  sources: RepositorySource[];
  filters: RepositorySearchFilters;
  sort: { field: "relevance" | "stars" | "updated" | "created"; direction: "asc" | "desc" };
  collectionMode: CollectionMode;
  resultLimit: number | null;
}

export interface SearchContext {
  requestId: string;
  jobId: string;
  signal: AbortSignal;
  /** Resume after the last durable page for providers with linear pagination. */
  resumePage?: number | undefined;
  onRateLimit?: ((details: { retry: number; delayMs: number; rateLimit: RateLimitStatus }) => void | Promise<void>) | undefined;
}

export interface NormalizedRepository {
  id: string;
  source: RepositorySource;
  externalId: string;
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  repositoryUrl: string;
  cloneUrl: string | null;
  defaultBranch: string | null;
  language: string | null;
  languages: string[];
  topics: string[];
  stars: number;
  forks: number;
  watchers: number | null;
  openIssues: number | null;
  license: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  pushedAt: string | null;
  archived: boolean;
  fork: boolean;
  visibility: string | null;
  sourceMetadata: Record<string, unknown>;
}

export interface RepositorySearchBatch {
  source: RepositorySource;
  page: number;
  repositories: NormalizedRepository[];
  rawRepositories: unknown[];
  total: number | null;
  hasMore: boolean;
  rateLimit: RateLimitStatus;
  partition: string | null;
  durationMs: number;
  providerLimited?: boolean;
}
