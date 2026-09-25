import type { PlatformConnector } from "../core/connector.interface.js";
import { ConnectorError } from "../core/connector.errors.js";
import type { ConnectorCapabilities, ConnectorContext, ConnectorHealth, ConnectorItemResult, ConnectorSearchRequest, ConnectorSearchResult, FetchItemRequest, RateLimitStatus } from "../core/connector.types.js";
import { GitLabClient } from "./gitlab.client.js";
import { gitLabRawItem, mapGitLabProject } from "./gitlab.mapper.js";
import type { GitLabProject } from "./gitlab.types.js";
import type { RepositorySearchBatch, RepositorySearchRequest, SearchContext } from "../../types/repositorySearch.js";
import { streamSearchPages } from "../core/streamPages.js";

export class GitLabConnector implements PlatformConnector {
  readonly id = "gitlab";
  readonly name = "GitLab";
  readonly version = "0.1.0";
  readonly homepageUrl: string;
  readonly accessMethod = "Official GitLab Projects REST API";
  readonly enabled: boolean;
  readonly authentication: "anonymous" | "token_configured";
  readonly capabilities: ConnectorCapabilities = {
    search: true, itemDetails: true, comments: false, repositories: true, users: false,
    issues: false, pullRequests: false, releases: false, commits: false, changeTracking: false
  };
  #health: ConnectorHealth = { status: "healthy", message: null, lastSuccessfulRequestAt: null };
  constructor(private readonly client: GitLabClient, options: { enabled?: boolean; tokenConfigured?: boolean; homepageUrl?: string } = {}) {
    this.homepageUrl = options.homepageUrl ?? "https://gitlab.com/";
    this.enabled = options.enabled ?? true;
    this.authentication = options.tokenConfigured ? "token_configured" : "anonymous";
    if (!this.enabled) this.#health = { status: "disabled", message: "Connector disabled by configuration", lastSuccessfulRequestAt: null };
  }
  async validateConfig(): Promise<void> { return Promise.resolve(); }
  getRateLimitStatus(): RateLimitStatus { return this.client.getRateLimitStatus(); }
  getHealth(): ConnectorHealth { return { ...this.#health }; }

  async search(request: ConnectorSearchRequest, context: ConnectorContext): Promise<ConnectorSearchResult> {
    if (!this.enabled) throw new ConnectorError(this.id, "disabled", "GitLab connector is disabled", false);
    const startedAt = Date.now();
    if (request.types.length > 0 && !request.types.includes("repository")) throw new ConnectorError(this.id, "unsupported_capability", "GitLab currently supports repository search only", false);
    const params = projectParams(request);
    try {
      const response = await this.client.get<GitLabProject[]>(`/projects?${params}`, context.signal);
      if (!Array.isArray(response.body) || !response.body.every(isGitLabProject)) throw new ConnectorError(this.id, "malformed_response", "GitLab returned an unexpected project search response", false);
      const rows = response.body.filter((row) => matchesFilters(row, request));
      const items = rows.map((row) => mapGitLabProject(row, this.version, context));
      this.recordSuccess(startedAt);
      return { items, rawItems: items.map((item, index) => gitLabRawItem(item, rows[index])), total: response.total, hasMore: response.nextPage !== null, rateLimit: this.getRateLimitStatus() };
    } catch (error) { this.recordFailure(error); throw error; }
  }

  searchRepositories(request: RepositorySearchRequest, context: SearchContext): AsyncGenerator<RepositorySearchBatch> { return streamSearchPages(this, request, context, 100); }

  async fetchItem(request: FetchItemRequest, context: ConnectorContext): Promise<ConnectorItemResult> {
    if (request.sourceType !== "repository" || !request.locator.trim()) throw new ConnectorError(this.id, "validation", "GitLab repository locator must be a project ID or namespace/name", false);
    try {
      const response = await this.client.get<GitLabProject>(`/projects/${encodeURIComponent(request.locator)}`, context.signal);
      if (!isGitLabProject(response.body)) throw new ConnectorError(this.id, "malformed_response", "GitLab returned an unexpected project response", false);
      const item = mapGitLabProject(response.body, this.version, context);
      this.recordSuccess();
      return { item, rawItem: gitLabRawItem(item, response.body), rateLimit: this.getRateLimitStatus() };
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

function projectParams(request: ConnectorSearchRequest): URLSearchParams {
  const params = new URLSearchParams({ search: request.query, visibility: "public", simple: "false", page: String(request.page), per_page: String(request.perPage) });
  if (request.filters.language) params.set("with_programming_language", request.filters.language);
  if (request.filters.updatedAfter) params.set("updated_after", request.filters.updatedAfter);
  if (request.filters.updatedBefore) params.set("updated_before", request.filters.updatedBefore);
  if (request.filters.archived !== undefined) params.set("archived", String(request.filters.archived));
  if (request.filters.tags?.[0]) params.set("topic", request.filters.tags[0]);
  const sortMap: Partial<Record<ConnectorSearchRequest["sort"], string>> = { most_starred: "star_count", recently_updated: "last_activity_at", newest: "created_at", oldest: "created_at" };
  const orderBy = sortMap[request.sort];
  if (orderBy) { params.set("order_by", orderBy); params.set("sort", request.sort === "oldest" ? "asc" : "desc"); }
  return params;
}

function matchesFilters(row: GitLabProject, request: ConnectorSearchRequest): boolean {
  const filters = request.filters;
  if (filters.minStars !== undefined && row.star_count < filters.minStars) return false;
  if (filters.maxStars !== undefined && row.star_count > filters.maxStars) return false;
  if (filters.minForks !== undefined && row.forks_count < filters.minForks) return false;
  if (filters.maxForks !== undefined && row.forks_count > filters.maxForks) return false;
  if (filters.author && row.namespace.full_path.toLocaleLowerCase() !== filters.author.toLocaleLowerCase()) return false;
  return true;
}

function isGitLabProject(value: unknown): value is GitLabProject {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Partial<GitLabProject>;
  return typeof row.id === "number" && typeof row.name === "string" && typeof row.name_with_namespace === "string" && typeof row.path_with_namespace === "string"
    && typeof row.web_url === "string" && typeof row.star_count === "number" && typeof row.forks_count === "number" && typeof row.created_at === "string"
    && typeof row.last_activity_at === "string" && typeof row.namespace === "object" && row.namespace !== null && typeof row.namespace.id === "number" && typeof row.namespace.full_path === "string";
}
