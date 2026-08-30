import type { SourceType } from "./normalizedItem.js";

export type SearchSort = "relevance" | "newest" | "oldest" | "recently_updated" | "most_starred" | "most_forked" | "most_discussed" | "source";

export interface SearchFilters {
  language?: string | undefined;
  minStars?: number | undefined;
  maxStars?: number | undefined;
  minForks?: number | undefined;
  maxForks?: number | undefined;
  author?: string | undefined;
  tags?: string[] | undefined;
  createdAfter?: string | undefined;
  createdBefore?: string | undefined;
  updatedAfter?: string | undefined;
  updatedBefore?: string | undefined;
}

export interface SearchQuery {
  query: string;
  sources: string[];
  types: SourceType[];
  filters: SearchFilters;
  sort: SearchSort;
  page: number;
  perPage: number;
}
