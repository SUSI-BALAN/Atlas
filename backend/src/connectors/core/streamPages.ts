import { logger } from "../../config/logger.js";
import type { RepositorySearchBatch, RepositorySearchRequest, RepositorySource, SearchContext } from "../../types/repositorySearch.js";
import type { ConnectorSearchRequest, ConnectorSearchResult } from "./connector.types.js";
import { withRetry } from "./retry.js";
import { normalizedItemToRepository } from "./repositoryAdapter.js";

interface PageConnector {
  id: string;
  search(request: ConnectorSearchRequest, context: { requestId: string; jobId: string; signal: AbortSignal }): Promise<ConnectorSearchResult>;
}

export async function* streamSearchPages(connector: PageConnector, request: RepositorySearchRequest, context: SearchContext, pageSize: number): AsyncGenerator<RepositorySearchBatch> {
  let fetched = 0;
  const modeLimit = request.resultLimit ?? (request.collectionMode === "preview" ? 50 : request.collectionMode === "expanded" ? 500 : null);
  for (let page = Math.max(1, context.resumePage ?? 1); ; page += 1) {
    if (context.signal.aborted) throw context.signal.reason ?? new DOMException("Aborted", "AbortError");
    const remaining = modeLimit === null ? pageSize : Math.min(pageSize, modeLimit - fetched);
    if (remaining <= 0) return;
    const started = Date.now();
    const pageRequest = toConnectorRequest(request, page, remaining);
    const result = await withRetry(
      () => connector.search(pageRequest, context),
      { signal: context.signal, onRetry: (retry, delayMs, error) => { logger.warn({ connector: connector.id, jobId: context.jobId, page, retry, delayMs, code: error.code }, "Retrying connector page"); if (error.code === "rate_limited") void context.onRateLimit?.({ retry, delayMs, rateLimit: connectorRateLimit(error) }); } }
    );
    const items = modeLimit === null ? result.items : result.items.slice(0, modeLimit - fetched);
    fetched += items.length;
    logger.info({ connector: connector.id, jobId: context.jobId, page, resultCount: items.length, durationMs: Date.now() - started, rateLimitRemaining: result.rateLimit.remaining }, "Connector page collected");
    yield {
      source: connector.id as RepositorySource,
      page,
      repositories: items.map(normalizedItemToRepository),
      rawRepositories: result.rawItems.slice(0, items.length).map((raw) => raw.data),
      total: result.total,
      hasMore: result.hasMore && (modeLimit === null || fetched < modeLimit),
      rateLimit: result.rateLimit,
      partition: null,
      durationMs: Date.now() - started
    };
    if (!result.hasMore || items.length === 0 || (modeLimit !== null && fetched >= modeLimit)) return;
  }
}

function connectorRateLimit(error: import("./connector.errors.js").ConnectorError) { return { limit: null, remaining: 0, resetAt: error.retryAfterSeconds === null ? null : new Date(Date.now() + error.retryAfterSeconds * 1000).toISOString(), retryAfterSeconds: error.retryAfterSeconds }; }

function toConnectorRequest(request: RepositorySearchRequest, page: number, perPage: number): ConnectorSearchRequest {
  const language = request.filters.language?.[0];
  const license = request.filters.license?.[0];
  return {
    query: request.query,
    types: ["repository"],
    filters: {
      ...(language ? { language } : {}),
      ...(request.filters.starsMin !== undefined ? { minStars: request.filters.starsMin } : {}),
      ...(request.filters.starsMax !== undefined ? { maxStars: request.filters.starsMax } : {}),
      ...(request.filters.createdAfter ? { createdAfter: request.filters.createdAfter } : {}),
      ...(request.filters.createdBefore ? { createdBefore: request.filters.createdBefore } : {}),
      ...(request.filters.updatedAfter ? { updatedAfter: request.filters.updatedAfter } : {}),
      ...(request.filters.owner ? { author: request.filters.owner } : {}),
      ...(request.filters.organization ? { organization: request.filters.organization } : {}),
      ...(request.filters.topic ? { tags: request.filters.topic } : {}),
      ...(license ? { license } : {}),
      ...(request.filters.archived !== undefined ? { archived: request.filters.archived } : {})
    },
    sort: sortValue(request.sort.field, request.sort.direction),
    page,
    perPage
  };
}

function sortValue(field: RepositorySearchRequest["sort"]["field"], direction: RepositorySearchRequest["sort"]["direction"]): ConnectorSearchRequest["sort"] {
  if (field === "stars") return "most_starred";
  if (field === "updated") return "recently_updated";
  if (field === "created") return direction === "asc" ? "oldest" : "newest";
  return "relevance";
}
