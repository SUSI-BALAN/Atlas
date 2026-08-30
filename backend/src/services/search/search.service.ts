import { ConnectorError } from "../../connectors/core/connector.errors.js";
import type { ConnectorSearchResult, RateLimitStatus } from "../../connectors/core/connector.types.js";
import type { ConnectorRegistry } from "../../connectors/core/connectorRegistry.js";
import { logger } from "../../config/logger.js";
import { isDatabaseConnected } from "../../database/mongoose.js";
import { SearchHistoryModel } from "../../models/searchHistory.model.js";
import type { NormalizedItem } from "../../types/normalizedItem.js";
import type { SearchQuery } from "../../types/search.js";
import { persistCollectedItems } from "../collection/persistCollectedItems.js";
import { deduplicate } from "../deduplication/deduplicate.js";
import { rankItems } from "../ranking/rank.js";

export interface SourceSearchStatus {
  source: string;
  status: "success" | "failed";
  resultCount: number;
  rateLimit: RateLimitStatus | null;
  error: { code: string; message: string; retryable: boolean } | null;
}

export interface UnifiedSearchResult {
  status: "completed" | "partially_completed" | "failed";
  results: NormalizedItem[];
  sourceStatus: SourceSearchStatus[];
  pagination: { page: number; perPage: number; returned: number; hasMore: boolean };
}

export class SearchService {
  constructor(private readonly registry: ConnectorRegistry, private readonly concurrency: number) {}

  async search(query: SearchQuery, requestId: string): Promise<UnifiedSearchResult> {
    const executions = await mapLimit(query.sources, this.concurrency, async (source) => {
      const connector = this.registry.get(source);
      if (!connector) return failure(source, "CONNECTOR_NOT_FOUND", "Connector is not registered", false);
      if (!connector.capabilities.search) return failure(source, "UNSUPPORTED_CAPABILITY", "Connector does not support search", false);
      try {
        const result = await connector.search(query, { requestId, jobId: null });
        await persistCollectedItems(connector, result.items, result.rawItems, requestId, null);
        return { source, connectorResult: result } as const;
      } catch (error) {
        const safe = error instanceof ConnectorError
          ? { code: error.code.toUpperCase(), message: error.message, retryable: error.retryable }
          : { code: "CONNECTOR_ERROR", message: "Connector search failed", retryable: false };
        logger.warn({ err: error, source, requestId }, "Search connector failed");
        return failure(source, safe.code, safe.message, safe.retryable);
      }
    });

    const successes = executions.filter((entry): entry is { source: string; connectorResult: ConnectorSearchResult } => "connectorResult" in entry);
    const failures = executions.filter((entry): entry is ReturnType<typeof failure> => "failureStatus" in entry);
    const results = rankItems(deduplicate(successes.flatMap((entry) => entry.connectorResult.items)), query).slice(0, query.perPage);
    const status = failures.length === 0 ? "completed" : successes.length === 0 ? "failed" : "partially_completed";
    const sourceStatus: SourceSearchStatus[] = [
      ...successes.map(({ source, connectorResult }) => ({ source, status: "success" as const, resultCount: connectorResult.items.length, rateLimit: connectorResult.rateLimit, error: null })),
      ...failures.map((entry) => entry.failureStatus)
    ];
    const response: UnifiedSearchResult = {
      status,
      results,
      sourceStatus,
      pagination: { page: query.page, perPage: query.perPage, returned: results.length, hasMore: successes.some((entry) => entry.connectorResult.hasMore) }
    };
    await this.persistHistory(query, requestId, response);
    return response;
  }

  private async persistHistory(query: SearchQuery, requestId: string, result: UnifiedSearchResult): Promise<void> {
    if (!isDatabaseConnected()) return;
    try {
      await SearchHistoryModel.create({ ...query, resultCount: result.results.length, status: result.status, requestId, searchedAt: new Date() });
    } catch (error) {
      logger.error({ err: error, requestId }, "Failed to persist search history");
    }
  }
}

function failure(source: string, code: string, message: string, retryable: boolean) {
  return {
    source,
    failureStatus: { source, status: "failed" as const, resultCount: 0, rateLimit: null, error: { code, message, retryable } }
  };
}

async function mapLimit<T, R>(values: T[], limit: number, task: (value: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(values.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < values.length) {
      const index = cursor++;
      const value = values[index];
      if (value !== undefined) results[index] = await task(value);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => worker()));
  return results;
}
