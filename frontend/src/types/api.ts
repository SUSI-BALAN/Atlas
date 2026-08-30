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
  sourceStatus: Array<{ source: string; status: "success" | "failed"; resultCount: number; error: { message: string } | null }>;
  pagination: { page: number; perPage: number; returned: number; hasMore: boolean };
}

export interface ConnectorSummary {
  id: string;
  name: string;
  version: string;
  capabilities: Record<string, boolean>;
  health: { status: string; message: string | null; lastSuccessfulRequestAt: string | null };
  rateLimit: { limit: number | null; remaining: number | null; resetAt: string | null };
}
