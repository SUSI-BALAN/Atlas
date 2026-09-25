export type SourceType = "repository" | "user" | "organization" | "issue" | "pull_request" | "release" | "commit" | "package" | "article" | "discussion" | "question" | "answer" | "documentation" | "feed_item" | "web_page" | "other";

export interface NormalizedItem {
  id: string;
  source: string;
  sourceId: string;
  sourceType: SourceType;
  title: string;
  description: string | null;
  url: string;
  author: { username: string | null; displayName: string | null; avatarUrl: string | null; profileUrl: string | null } | null;
  metrics: { stars: number | null; forks: number | null; comments: number | null; watchers: number | null; openIssues: number | null };
  tags: string[];
  language: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  collectedAt: string;
  metadata: Record<string, unknown>;
}

export interface SearchRequest {
  query: string;
  sources: string[];
  types: SourceType[];
  filters: { language?: string; minStars?: number };
  sort: string;
  page: number;
  perPage: number;
}

export interface SearchResponse {
  status: "completed" | "partially_completed" | "failed";
  results: NormalizedItem[];
  sourceStatus: Array<{
    source: string;
    status: "success" | "failed";
    resultCount: number;
    total: number | null;
    hasMore: boolean;
    rateLimit: { limit: number | null; remaining: number | null; resetAt: string | null; retryAfterSeconds: number | null } | null;
    error: { message: string; retryable?: boolean } | null;
  }>;
  pagination: { page: number; perPage: number; perSourcePageSize: number; returned: number; hasMore: boolean };
}

export interface ConnectorSummary {
  id: string;
  name: string;
  version: string;
  homepageUrl: string;
  accessMethod: string;
  enabled: boolean;
  authentication: "anonymous" | "token_configured";
  capabilities: Record<string, boolean>;
  health: { status: string; message: string | null; lastSuccessfulRequestAt: string | null; lastCheckedAt?: string | null; latencyMs?: number | null };
  rateLimit: { limit: number | null; remaining: number | null; resetAt: string | null; used?: number | null };
}

export type RepositorySource = "github" | "gitlab" | "codeberg" | "gitea" | "forgejo";
export interface RepositorySearchJobRequest {
  query: string;
  sources: RepositorySource[] | "all";
  filters: { language?: string[]; topic?: string[]; starsMin?: number; starsMax?: number; createdAfter?: string; createdBefore?: string; updatedAfter?: string; license?: string[]; archived?: boolean };
  sort: { field: "relevance" | "stars" | "updated" | "created"; direction: "asc" | "desc" };
  collectionMode: "preview" | "expanded" | "all";
  resultLimit?: number | null;
}
export interface NormalizedRepository {
  id: string; source: RepositorySource; externalId: string; owner: string; name: string; fullName: string;
  description: string | null; repositoryUrl: string; cloneUrl: string | null; defaultBranch: string | null;
  language: string | null; languages: string[]; topics: string[]; stars: number; forks: number;
  watchers: number | null; openIssues: number | null; license: string | null; createdAt: string | null;
  updatedAt: string | null; pushedAt: string | null; archived: boolean; fork: boolean; visibility: string | null;
  sourceMetadata: Record<string, unknown>;
}
export interface SourceJobProgress {
  source: RepositorySource; status: "queued" | "running" | "rate_limited" | "completed" | "cancelled" | "failed";
  fetched: number; pages: number; total: number | null;
  rateLimit: { limit: number | null; remaining: number | null; resetAt: string | null; retryAfterSeconds: number | null; used?: number | null } | null;
  error: { code: string; message: string; retryable: boolean } | null;
  providerLimited?: boolean;
}
export interface SearchJob {
  jobId: string; status: "queued" | "running" | "rate_limited" | "partially_complete" | "completed" | "cancelled" | "failed";
  request: RepositorySearchJobRequest & { sources: RepositorySource[]; resultLimit: number | null };
  sourceProgress: SourceJobProgress[]; totalUnique: number; cancelRequested: boolean; cached: boolean;
  createdAt: string; startedAt: string | null; completedAt: string | null;
}
export interface RepositoryResultPage { results: NormalizedRepository[]; nextCursor: string | null; hasMore: boolean }
