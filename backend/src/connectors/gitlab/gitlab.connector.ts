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
  #health: ConnectorHealth = { status: "unavailable", message: "Connector has not completed a request yet", lastSuccessfulRequestAt: null, lastCheckedAt: null };
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
      const rows = validatedProjects(response.body);
      const filteredRows = rows.filter((row) => matchesFilters(row, request));
      const items = filteredRows.map((row) => mapGitLabProject(row, this.version, context));
      this.recordSuccess(startedAt);
      return { items, rawItems: items.map((item, index) => gitLabRawItem(item, filteredRows[index])), total: response.total, hasMore: response.nextPage !== null, rateLimit: this.getRateLimitStatus() };
    } catch (error) { this.recordFailure(error); throw error; }
  }

  searchRepositories(request: RepositorySearchRequest, context: SearchContext): AsyncGenerator<RepositorySearchBatch> { return streamSearchPages(this, request, context, 100); }

  async fetchItem(request: FetchItemRequest, context: ConnectorContext): Promise<ConnectorItemResult> {
    if (request.sourceType !== "repository" || !request.locator.trim()) throw new ConnectorError(this.id, "validation", "GitLab repository locator must be a project ID or namespace/name", false);
    try {
      const response = await this.client.get<GitLabProject>(`/projects/${encodeURIComponent(request.locator)}`, context.signal);
      const project = validatedProject(response.body);
      const item = mapGitLabProject(project, this.version, context);
      this.recordSuccess();
      return { item, rawItem: gitLabRawItem(item, project), rateLimit: this.getRateLimitStatus() };
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

function validatedProjects(value: unknown): GitLabProject[] {
  if (!Array.isArray(value)) throw malformedProjects(["response"]);
  const failures = value.map((project, index) => ({ index, fields: projectValidationFailures(project) })).filter((entry) => entry.fields.length > 0);
  if (failures.length > 0) throw malformedProjects(failures.flatMap(({ index, fields }) => fields.map((field) => `${index}.${field}`)));
  return value as GitLabProject[];
}

function validatedProject(value: unknown): GitLabProject {
  const fields = projectValidationFailures(value);
  if (fields.length > 0) throw new ConnectorError("gitlab", "malformed_response", `GitLab project response failed validation at fields: ${fields.slice(0, 12).join(", ")}${fields.length > 12 ? ` (+${fields.length - 12} more)` : ""}`, false);
  return value as GitLabProject;
}

function malformedProjects(paths: string[]): ConnectorError {
  const shown = paths.slice(0, 12);
  const suffix = paths.length > shown.length ? ` (+${paths.length - shown.length} more)` : "";
  return new ConnectorError("gitlab", "malformed_response", `GitLab project search response failed validation at record fields: ${shown.join(", ")}${suffix}`, false);
}

function projectValidationFailures(value: unknown): string[] {
  if (!isRecord(value)) return ["record"];
  const failures: string[] = [];
  required(value, "id", "number", failures);
  required(value, "name", "string", failures);
  required(value, "name_with_namespace", "string", failures);
  required(value, "path_with_namespace", "string", failures);
  nullable(value, "description", "string", failures);
  required(value, "web_url", "string", failures);
  required(value, "star_count", "number", failures);
  required(value, "forks_count", "number", failures);
  optionalNumber(value, "open_issues_count", failures);
  required(value, "created_at", "string", failures);
  required(value, "last_activity_at", "string", failures);
  optional(value, "updated_at", "string", false, failures);
  optional(value, "http_url_to_repo", "string", false, failures);
  optional(value, "avatar_url", "string", true, failures);
  optional(value, "default_branch", "string", true, failures);
  optional(value, "archived", "boolean", false, failures);
  optional(value, "visibility", "string", false, failures);
  optional(value, "readme_url", "string", true, failures);
  optionalStringArray(value, "topics", failures);
  optionalStringArray(value, "tag_list", failures);
  if (!isRecord(value.namespace)) failures.push("namespace");
  else {
    required(value.namespace, "id", "number", failures, "namespace.");
    required(value.namespace, "name", "string", failures, "namespace.");
    required(value.namespace, "full_path", "string", failures, "namespace.");
    optional(value.namespace, "kind", "string", false, failures, "namespace.");
    optional(value.namespace, "avatar_url", "string", true, failures, "namespace.");
    optional(value.namespace, "web_url", "string", false, failures, "namespace.");
  }
  return failures;
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function required(record: Record<string, unknown>, field: string, type: "string" | "number" | "boolean", failures: string[], prefix = ""): void {
  if (typeof record[field] !== type || (type === "number" && !Number.isFinite(record[field]))) failures.push(`${prefix}${field}`);
}
function nullable(record: Record<string, unknown>, field: string, type: "string", failures: string[]): void {
  if (record[field] !== null && typeof record[field] !== type) failures.push(field);
}
function optional(record: Record<string, unknown>, field: string, type: "string" | "boolean", allowNull: boolean, failures: string[], prefix = ""): void {
  const value = record[field];
  if (value !== undefined && !(allowNull && value === null) && typeof value !== type) failures.push(`${prefix}${field}`);
}
function optionalNumber(record: Record<string, unknown>, field: string, failures: string[]): void {
  const value = record[field];
  if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value))) failures.push(field);
}
function optionalStringArray(record: Record<string, unknown>, field: string, failures: string[]): void {
  const value = record[field];
  if (value !== undefined && (!Array.isArray(value) || !value.every((entry) => typeof entry === "string"))) failures.push(field);
}
