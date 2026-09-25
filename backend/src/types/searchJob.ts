import type { RateLimitStatus } from "../connectors/core/connector.types.js";
import type { RepositorySearchRequest, RepositorySource } from "./repositorySearch.js";

export type SearchJobStatus = "queued" | "running" | "rate_limited" | "partially_complete" | "completed" | "cancelled" | "failed";
export type SourceJobStatus = "queued" | "running" | "rate_limited" | "completed" | "cancelled" | "failed";

export interface SourceProgress {
  source: RepositorySource;
  status: SourceJobStatus;
  fetched: number;
  pages: number;
  total: number | null;
  rateLimit: RateLimitStatus | null;
  cursor: { page: number; partition: string | null } | null;
  error: { code: string; message: string; retryable: boolean } | null;
  updatedAt: string;
  providerLimited?: boolean;
}

export interface SearchJobSnapshot {
  jobId: string;
  status: SearchJobStatus;
  request: RepositorySearchRequest;
  sourceProgress: SourceProgress[];
  totalUnique: number;
  cancelRequested: boolean;
  cached: boolean;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}
