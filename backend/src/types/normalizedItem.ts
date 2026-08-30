export const sourceTypes = [
  "repository", "user", "organization", "issue", "pull_request", "release", "commit",
  "package", "article", "discussion", "question", "answer", "documentation", "feed_item",
  "web_page", "other"
] as const;

export type SourceType = (typeof sourceTypes)[number];

export interface NormalizedAuthor {
  id: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
}

export interface NormalizedMetrics {
  views: number | null;
  stars: number | null;
  forks: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  watchers: number | null;
  openIssues: number | null;
}

export interface ItemProvenance {
  source: string;
  sourceId: string;
  sourceUrl: string;
  connectorVersion: string;
  requestId: string;
  jobId: string | null;
  collectedAt: string;
}

export interface NormalizedItem {
  id: string;
  source: string;
  sourceId: string;
  sourceType: SourceType;
  title: string;
  description: string | null;
  url: string;
  author: NormalizedAuthor | null;
  metrics: NormalizedMetrics;
  tags: string[];
  language: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  publishedAt: string | null;
  collectedAt: string;
  rawDataReference: string | null;
  provenance: ItemProvenance;
  metadata: Record<string, unknown>;
}

export function emptyMetrics(overrides: Partial<NormalizedMetrics> = {}): NormalizedMetrics {
  return {
    views: null, stars: null, forks: null, likes: null, comments: null,
    shares: null, watchers: null, openIssues: null, ...overrides
  };
}
