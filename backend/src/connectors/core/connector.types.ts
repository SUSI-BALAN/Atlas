import type { NormalizedItem, SourceType } from "../../types/normalizedItem.js";
import type { SearchFilters, SearchSort } from "../../types/search.js";

export interface ConnectorCapabilities {
  search: boolean;
  itemDetails: boolean;
  comments: boolean;
  repositories: boolean;
  users: boolean;
  issues: boolean;
  pullRequests: boolean;
  releases: boolean;
  commits: boolean;
  changeTracking: boolean;
}

export type ConnectorHealthStatus = "healthy" | "degraded" | "rate_limited" | "authentication_required" | "unavailable" | "disabled";

export interface ConnectorHealth {
  status: ConnectorHealthStatus;
  message: string | null;
  lastSuccessfulRequestAt: string | null;
}

export interface RateLimitStatus {
  limit: number | null;
  remaining: number | null;
  resetAt: string | null;
  retryAfterSeconds: number | null;
}

export interface ConnectorContext {
  requestId: string;
  jobId: string | null;
  signal?: AbortSignal;
}

export interface ConnectorSearchRequest {
  query: string;
  types: SourceType[];
  filters: SearchFilters;
  sort: SearchSort;
  page: number;
  perPage: number;
}

export interface RawConnectorItem {
  sourceId: string;
  sourceType: SourceType;
  sourceUrl: string;
  data: unknown;
}

export interface ConnectorSearchResult {
  items: NormalizedItem[];
  rawItems: RawConnectorItem[];
  total: number | null;
  hasMore: boolean;
  rateLimit: RateLimitStatus;
}

export interface FetchItemRequest {
  sourceType: SourceType;
  locator: string;
}

export interface ConnectorItemResult {
  item: NormalizedItem;
  rawItem: RawConnectorItem;
  rateLimit: RateLimitStatus;
}
