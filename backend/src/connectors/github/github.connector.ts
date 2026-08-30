import type { PlatformConnector } from "../core/connector.interface.js";
import { ConnectorError } from "../core/connector.errors.js";
import type {
  ConnectorCapabilities, ConnectorContext, ConnectorHealth, ConnectorItemResult,
  ConnectorSearchRequest, ConnectorSearchResult, FetchItemRequest, RateLimitStatus, RawConnectorItem
} from "../core/connector.types.js";
import type { NormalizedItem, SourceType } from "../../types/normalizedItem.js";
import { GitHubClient } from "./github.client.js";
import { mapCommit, mapIssue, mapRelease, mapRepository, mapUser, rawItem } from "./github.mapper.js";
import type { GitHubCommit, GitHubIssue, GitHubRelease, GitHubRepository, GitHubSearchResponse, GitHubUser } from "./github.types.js";

const searchableTypes = new Set<SourceType>(["repository", "user", "organization", "issue", "pull_request"]);

export class GitHubConnector implements PlatformConnector {
  readonly id = "github";
  readonly name = "GitHub";
  readonly version = "0.1.0";
  readonly capabilities: ConnectorCapabilities = {
    search: true, itemDetails: true, comments: false, repositories: true, users: true,
    issues: true, pullRequests: true, releases: true, commits: true, changeTracking: true
  };

  #health: ConnectorHealth = { status: "healthy", message: null, lastSuccessfulRequestAt: null };

  constructor(private readonly client: GitHubClient) {}

  async validateConfig(): Promise<void> {
    return Promise.resolve();
  }

  getRateLimitStatus(): RateLimitStatus {
    return this.client.getRateLimitStatus();
  }

  getHealth(): ConnectorHealth {
    return { ...this.#health };
  }

  async search(request: ConnectorSearchRequest, context: ConnectorContext): Promise<ConnectorSearchResult> {
    const requestedTypes = request.types.length === 0 ? ["repository" as const] : request.types.filter((type) => searchableTypes.has(type));
    if (requestedTypes.length === 0) {
      throw new ConnectorError(this.id, "unsupported_capability", "GitHub cannot search the requested content types", false);
    }

    const perType = Math.max(1, Math.min(100, Math.ceil(request.perPage / requestedTypes.length)));
    try {
      const results = await Promise.all(requestedTypes.map((type) => this.searchType(type, request, perType, context)));
      this.#health = { status: "healthy", message: null, lastSuccessfulRequestAt: new Date().toISOString() };
      const items = results.flatMap((entry) => entry.items).slice(0, request.perPage);
      const rawItems = results.flatMap((entry) => entry.rawItems).filter((raw) => items.some((item) => item.sourceId === raw.sourceId));
      const totals = results.map((entry) => entry.total).filter((value): value is number => value !== null);
      return {
        items,
        rawItems,
        total: totals.length === results.length ? totals.reduce((sum, value) => sum + value, 0) : null,
        hasMore: results.some((entry) => entry.hasMore),
        rateLimit: this.getRateLimitStatus()
      };
    } catch (error) {
      this.recordFailure(error);
      throw error;
    }
  }

  async fetchItem(request: FetchItemRequest, context: ConnectorContext): Promise<ConnectorItemResult> {
    try {
      const result = await this.fetchByType(request, context);
      this.#health = { status: "healthy", message: null, lastSuccessfulRequestAt: new Date().toISOString() };
      return { ...result, rateLimit: this.getRateLimitStatus() };
    } catch (error) {
      this.recordFailure(error);
      throw error;
    }
  }

  fetchUpdates(request: FetchItemRequest, context: ConnectorContext): Promise<ConnectorItemResult> {
    return this.fetchItem(request, context);
  }

  private async searchType(type: SourceType, request: ConnectorSearchRequest, perPage: number, context: ConnectorContext): Promise<ConnectorSearchResult> {
    const params = new URLSearchParams({ per_page: String(perPage), page: String(request.page) });
    let endpoint: string;
    let mapper: (data: never, context: ConnectorContext) => NormalizedItem;

    if (type === "repository") {
      params.set("q", repositoryQuery(request));
      const sort = repositorySort(request.sort);
      if (sort) params.set("sort", sort);
      if (request.sort === "oldest") params.set("order", "asc");
      endpoint = `/search/repositories?${params}`;
      mapper = mapRepository as never;
    } else if (type === "user" || type === "organization") {
      params.set("q", `${request.query}${type === "organization" ? " type:org" : " type:user"}`);
      endpoint = `/search/users?${params}`;
      mapper = mapUser as never;
    } else if (type === "issue" || type === "pull_request") {
      params.set("q", `${request.query} ${type === "pull_request" ? "is:pr" : "is:issue"}${issueDateQualifiers(request)}`);
      const issueSort = request.sort === "most_discussed" ? "comments" : request.sort === "newest" || request.sort === "oldest" ? "created" : request.sort === "recently_updated" ? "updated" : null;
      if (issueSort) params.set("sort", issueSort);
      if (request.sort === "oldest") params.set("order", "asc");
      endpoint = `/search/issues?${params}`;
      mapper = ((data: GitHubIssue, ctx: ConnectorContext) => mapIssue(data, ctx, type)) as never;
    } else {
      throw new ConnectorError(this.id, "unsupported_capability", `GitHub cannot search '${type}'`, false);
    }

    const response = await this.client.get<GitHubSearchResponse<never>>(endpoint, context.signal);
    const items = response.items.map((entry) => mapper(entry, context));
    return {
      items,
      rawItems: items.map((item, index) => rawItem(item, response.items[index])),
      total: response.total_count,
      hasMore: request.page * perPage < Math.min(response.total_count, 1000),
      rateLimit: this.getRateLimitStatus()
    };
  }

  private async fetchByType(request: FetchItemRequest, context: ConnectorContext): Promise<{ item: NormalizedItem; rawItem: RawConnectorItem }> {
    if (request.sourceType === "repository") {
      assertRepo(request.locator);
      const repository = await this.client.get<GitHubRepository>(`/repos/${request.locator}`, context.signal);
      const languages = await this.client.get<Record<string, number>>(`/repos/${request.locator}/languages`, context.signal);
      const item = mapRepository(repository, context);
      item.metadata.languages = languages;
      return { item, rawItem: rawItem(item, { repository, languages }) };
    }
    if (request.sourceType === "user" || request.sourceType === "organization") {
      assertSimpleLocator(request.locator, "user");
      const data = await this.client.get<GitHubUser>(`/users/${encodeURIComponent(request.locator)}`, context.signal);
      const item = mapUser(data, context);
      return { item, rawItem: rawItem(item, data) };
    }
    if (request.sourceType === "issue" || request.sourceType === "pull_request") {
      const { repo, suffix } = splitLocator(request.locator, "#");
      assertRepo(repo);
      if (!/^\d+$/.test(suffix)) throw invalidLocator(request.sourceType);
      const kind = request.sourceType === "pull_request" ? "pulls" : "issues";
      const data = await this.client.get<GitHubIssue>(`/repos/${repo}/${kind}/${suffix}`, context.signal);
      const item = mapIssue(data, context, request.sourceType);
      return { item, rawItem: rawItem(item, data) };
    }
    if (request.sourceType === "release" || request.sourceType === "commit") {
      const { repo, suffix } = splitLocator(request.locator, "@");
      assertRepo(repo);
      if (!suffix) throw invalidLocator(request.sourceType);
      if (request.sourceType === "release") {
        const data = await this.client.get<GitHubRelease>(`/repos/${repo}/releases/tags/${encodeURIComponent(suffix)}`, context.signal);
        const item = mapRelease(data, context);
        return { item, rawItem: rawItem(item, data) };
      }
      const data = await this.client.get<GitHubCommit>(`/repos/${repo}/commits/${encodeURIComponent(suffix)}`, context.signal);
      const item = mapCommit(data, context);
      return { item, rawItem: rawItem(item, data) };
    }
    throw new ConnectorError(this.id, "unsupported_capability", `GitHub item details do not support '${request.sourceType}'`, false);
  }

  private recordFailure(error: unknown): void {
    if (error instanceof ConnectorError) {
      const status = error.code === "rate_limited" ? "rate_limited" : error.code === "authentication" ? "authentication_required" : "degraded";
      this.#health = { status, message: error.message, lastSuccessfulRequestAt: this.#health.lastSuccessfulRequestAt };
    } else {
      this.#health = { status: "degraded", message: "Unexpected connector failure", lastSuccessfulRequestAt: this.#health.lastSuccessfulRequestAt };
    }
  }
}

function repositoryQuery(request: ConnectorSearchRequest): string {
  const parts = [request.query];
  const filters = request.filters;
  if (filters.language) parts.push(`language:${filters.language}`);
  if (filters.minStars !== undefined || filters.maxStars !== undefined) parts.push(`stars:${range(filters.minStars, filters.maxStars)}`);
  if (filters.minForks !== undefined || filters.maxForks !== undefined) parts.push(`forks:${range(filters.minForks, filters.maxForks)}`);
  if (filters.author) parts.push(`user:${filters.author}`);
  parts.push(dateQualifiers(request).trim());
  return parts.filter(Boolean).join(" ");
}

function dateQualifiers(request: ConnectorSearchRequest): string {
  const parts: string[] = [];
  if (request.filters.createdAfter || request.filters.createdBefore) parts.push(`created:${range(request.filters.createdAfter, request.filters.createdBefore)}`);
  if (request.filters.updatedAfter || request.filters.updatedBefore) parts.push(`pushed:${range(request.filters.updatedAfter, request.filters.updatedBefore)}`);
  return parts.length ? ` ${parts.join(" ")}` : "";
}

function issueDateQualifiers(request: ConnectorSearchRequest): string {
  const parts: string[] = [];
  if (request.filters.createdAfter || request.filters.createdBefore) parts.push(`created:${range(request.filters.createdAfter, request.filters.createdBefore)}`);
  if (request.filters.updatedAfter || request.filters.updatedBefore) parts.push(`updated:${range(request.filters.updatedAfter, request.filters.updatedBefore)}`);
  return parts.length ? ` ${parts.join(" ")}` : "";
}

function range(min: number | string | undefined, max: number | string | undefined): string {
  if (min !== undefined && max !== undefined) return `${min}..${max}`;
  if (min !== undefined) return `>=${min}`;
  return `<=${String(max)}`;
}

function repositorySort(sort: ConnectorSearchRequest["sort"]): string | null {
  if (sort === "most_starred") return "stars";
  if (sort === "most_forked") return "forks";
  if (sort === "recently_updated" || sort === "newest" || sort === "oldest") return "updated";
  return null;
}

function assertRepo(locator: string): void {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(locator)) throw invalidLocator("repository");
}

function assertSimpleLocator(locator: string, type: string): void {
  if (!/^[A-Za-z0-9-]+$/.test(locator)) throw invalidLocator(type);
}

function splitLocator(locator: string, separator: string): { repo: string; suffix: string } {
  const index = locator.lastIndexOf(separator);
  if (index <= 0) throw invalidLocator("item");
  return { repo: locator.slice(0, index), suffix: locator.slice(index + 1) };
}

function invalidLocator(type: string): ConnectorError {
  return new ConnectorError("github", "validation", `Invalid GitHub ${type} locator`, false);
}
