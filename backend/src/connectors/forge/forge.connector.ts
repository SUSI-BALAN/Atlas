import type { PlatformConnector } from "../core/connector.interface.js";
import { ConnectorError } from "../core/connector.errors.js";
import type { ConnectorCapabilities, ConnectorContext, ConnectorHealth, ConnectorItemResult, ConnectorSearchRequest, ConnectorSearchResult, FetchItemRequest, RateLimitStatus } from "../core/connector.types.js";
import { ForgeClient } from "./forge.client.js";
import { forgeRawItem, mapForgeRepository } from "./forge.mapper.js";
import type { ForgeRepository, ForgeSearchResponse } from "./forge.types.js";
import type { RepositorySearchBatch, RepositorySearchRequest, SearchContext } from "../../types/repositorySearch.js";
import { streamSearchPages } from "../core/streamPages.js";

export interface ForgeConnectorOptions {
  id: string;
  name: string;
  homepageUrl: string;
  version?: string;
  enabled?: boolean;
  tokenConfigured?: boolean;
}

export class ForgeConnector implements PlatformConnector {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly homepageUrl: string;
  readonly accessMethod = "Public Gitea/Forgejo REST API";
  readonly enabled: boolean;
  readonly authentication: "anonymous" | "token_configured";
  readonly capabilities: ConnectorCapabilities = {
    search: true, itemDetails: true, comments: false, repositories: true, users: false,
    issues: false, pullRequests: false, releases: false, commits: false, changeTracking: false
  };
  #health: ConnectorHealth = { status: "healthy", message: null, lastSuccessfulRequestAt: null };

  constructor(private readonly client: ForgeClient, options: ForgeConnectorOptions) {
    this.id = options.id;
    this.name = options.name;
    this.homepageUrl = options.homepageUrl;
    this.version = options.version ?? "0.1.0";
    this.enabled = options.enabled ?? true;
    this.authentication = options.tokenConfigured ? "token_configured" : "anonymous";
    if (!this.enabled) this.#health = { status: "disabled", message: "Connector disabled by configuration", lastSuccessfulRequestAt: null };
  }

  async validateConfig(): Promise<void> { return Promise.resolve(); }
  getRateLimitStatus(): RateLimitStatus { return this.client.getRateLimitStatus(); }
  getHealth(): ConnectorHealth { return { ...this.#health }; }

  async search(request: ConnectorSearchRequest, context: ConnectorContext): Promise<ConnectorSearchResult> {
    if (!this.enabled) throw new ConnectorError(this.id, "disabled", `${this.name} connector is disabled`, false);
    const startedAt = Date.now();
    if (request.types.length > 0 && !request.types.includes("repository")) {
      throw new ConnectorError(this.id, "unsupported_capability", `${this.name} currently supports repository search only`, false);
    }
    const params = new URLSearchParams({ q: request.query, includeDesc: "true", page: String(request.page), limit: String(request.perPage), private: "false" });
    const sort = forgeSort(request.sort);
    if (sort) { params.set("sort", sort); params.set("order", request.sort === "oldest" ? "asc" : "desc"); }
    try {
      const response = await this.client.get<ForgeSearchResponse>(`/repos/search?${params}`, context.signal);
      if (!isForgeSearchResponse(response.body)) throw new ConnectorError(this.id, "malformed_response", `${this.name} returned an unexpected repository search response`, false);
      let rows = response.body.data;
      rows = rows.filter((row) => matchesFilters(row, request));
      const items = rows.map((row) => mapForgeRepository(row, this.id, this.version, context));
      this.recordSuccess(startedAt);
      return {
        items,
        rawItems: items.map((item, index) => forgeRawItem(item, rows[index])),
        total: response.total,
        hasMore: response.total === null ? response.body.data.length === request.perPage : request.page * request.perPage < response.total,
        rateLimit: this.getRateLimitStatus()
      };
    } catch (error) { this.recordFailure(error); throw error; }
  }

  searchRepositories(request: RepositorySearchRequest, context: SearchContext): AsyncGenerator<RepositorySearchBatch> { return streamSearchPages(this, request, context, 50); }

  async fetchItem(request: FetchItemRequest, context: ConnectorContext): Promise<ConnectorItemResult> {
    if (request.sourceType !== "repository" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(request.locator)) {
      throw new ConnectorError(this.id, "validation", `${this.name} repository locator must be owner/name`, false);
    }
    try {
      const response = await this.client.get<ForgeRepository>(`/repos/${request.locator}`, context.signal);
      if (!isForgeRepository(response.body)) throw new ConnectorError(this.id, "malformed_response", `${this.name} returned an unexpected repository response`, false);
      const item = mapForgeRepository(response.body, this.id, this.version, context);
      this.recordSuccess();
      return { item, rawItem: forgeRawItem(item, response.body), rateLimit: this.getRateLimitStatus() };
    } catch (error) { this.recordFailure(error); throw error; }
  }

  fetchUpdates(request: FetchItemRequest, context: ConnectorContext): Promise<ConnectorItemResult> { return this.fetchItem(request, context); }

  private recordFailure(error: unknown): void {
    const status = error instanceof ConnectorError && error.code === "rate_limited" ? "rate_limited"
      : error instanceof ConnectorError && error.code === "authentication" ? "authentication_required" : "degraded";
    this.#health = { status, message: error instanceof Error ? error.message : "Unexpected connector failure", lastSuccessfulRequestAt: this.#health.lastSuccessfulRequestAt };
  }
  private recordSuccess(startedAt?: number): void {
    const checkedAt = new Date().toISOString();
    this.#health = { status: "healthy", message: null, lastSuccessfulRequestAt: checkedAt, lastCheckedAt: checkedAt, ...(startedAt === undefined ? {} : { latencyMs: Date.now() - startedAt }) };
  }
}

function forgeSort(sort: ConnectorSearchRequest["sort"]): string | null {
  if (sort === "most_starred") return "stars";
  if (sort === "most_forked") return "forks";
  if (sort === "recently_updated" || sort === "newest" || sort === "oldest") return "updated";
  return null;
}

function matchesFilters(row: ForgeRepository, request: ConnectorSearchRequest): boolean {
  const filters = request.filters;
  if (filters.language && row.language?.toLocaleLowerCase() !== filters.language.toLocaleLowerCase()) return false;
  if (filters.minStars !== undefined && row.stars_count < filters.minStars) return false;
  if (filters.maxStars !== undefined && row.stars_count > filters.maxStars) return false;
  if (filters.minForks !== undefined && row.forks_count < filters.minForks) return false;
  if (filters.maxForks !== undefined && row.forks_count > filters.maxForks) return false;
  if (filters.author && row.owner.login.toLocaleLowerCase() !== filters.author.toLocaleLowerCase()) return false;
  if (filters.tags && !filters.tags.every((topic) => (row.topics ?? []).some((candidate) => candidate.toLocaleLowerCase() === topic.toLocaleLowerCase()))) return false;
  if (filters.archived !== undefined && Boolean(row.archived) !== filters.archived) return false;
  return true;
}

function isForgeSearchResponse(value: unknown): value is ForgeSearchResponse {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray(value.data) && value.data.every(isForgeRepository);
}

function isForgeRepository(value: unknown): value is ForgeRepository {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Partial<ForgeRepository>;
  return typeof row.id === "number" && typeof row.name === "string" && typeof row.full_name === "string" && typeof row.html_url === "string"
    && typeof row.stars_count === "number" && typeof row.forks_count === "number" && typeof row.created_at === "string" && typeof row.updated_at === "string"
    && typeof row.owner === "object" && row.owner !== null && typeof row.owner.id === "number" && typeof row.owner.login === "string";
}
