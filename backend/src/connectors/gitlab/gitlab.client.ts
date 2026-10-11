import { ConnectorError } from "../core/connector.errors.js";
import type { RateLimitStatus } from "../core/connector.types.js";

export interface GitLabClientOptions {
  baseUrl: string;
  token?: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

export interface GitLabResponse<T> { body: T; total: number | null; nextPage: number | null; }

export class GitLabClient {
  #rateLimit: RateLimitStatus = { limit: null, remaining: null, resetAt: null, retryAfterSeconds: null };
  readonly #fetch: typeof fetch;
  constructor(private readonly options: GitLabClientOptions) { this.#fetch = options.fetchImpl ?? fetch; }
  getRateLimitStatus(): RateLimitStatus { return { ...this.#rateLimit }; }

  async get<T>(path: string, signal?: AbortSignal): Promise<GitLabResponse<T>> {
    const headers: Record<string, string> = { Accept: "application/json", "User-Agent": "universal-internet-platform-information-collector" };
    if (this.options.token) headers["PRIVATE-TOKEN"] = this.options.token;
    const requestUrl = new URL(path.replace(/^\//, ""), ensureTrailingSlash(this.options.baseUrl));
    let response: Response;
    try {
      const timeout = AbortSignal.timeout(this.options.timeoutMs);
      response = await this.#fetch(requestUrl, { headers, signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
    } catch (error) {
      if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
      if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) throw new ConnectorError("gitlab", "timeout", "GitLab request timed out", true);
      throw new ConnectorError("gitlab", "network", "GitLab request failed at the network boundary", true);
    }
    this.#rateLimit = parseRateLimit(response.headers);
    if (!response.ok) {
      const mapped = classifyStatus(response.status, this.#rateLimit.remaining);
      throw new ConnectorError("gitlab", mapped.code, `GitLab API returned HTTP ${response.status}`, mapped.retryable, response.status, this.#rateLimit.retryAfterSeconds);
    }
    const contentType = response.headers.get("content-type");
    if (!isJsonContentType(contentType)) {
      throw new ConnectorError("gitlab", "malformed_response", `GitLab returned an unexpected content type (${contentTypeCategory(contentType)})`, false, response.status);
    }
    const text = await response.text();
    let body: unknown = null;
    if (text) { try { body = JSON.parse(text); } catch { throw new ConnectorError("gitlab", "malformed_response", "GitLab returned malformed JSON", false, response.status); } }
    return { body: body as T, total: optionalNonNegativeIntHeader(response.headers, "x-total"), nextPage: nextPage(response.headers, requestUrl) };
  }
}

function ensureTrailingSlash(value: string): string { return value.endsWith("/") ? value : `${value}/`; }

function parseRateLimit(headers: Headers): RateLimitStatus {
  const resetRaw = optionalNonNegativeIntHeader(headers, "ratelimit-reset") ?? optionalNonNegativeIntHeader(headers, "x-ratelimit-reset");
  return {
    limit: optionalNonNegativeIntHeader(headers, "ratelimit-limit") ?? optionalNonNegativeIntHeader(headers, "x-ratelimit-limit"),
    remaining: optionalNonNegativeIntHeader(headers, "ratelimit-remaining") ?? optionalNonNegativeIntHeader(headers, "x-ratelimit-remaining"),
    resetAt: resetRaw === null ? null : new Date(resetRaw * 1000).toISOString(),
    retryAfterSeconds: retryAfterSeconds(headers.get("retry-after")),
    used: optionalNonNegativeIntHeader(headers, "ratelimit-observed") ?? optionalNonNegativeIntHeader(headers, "x-ratelimit-used")
  };
}

function optionalNonNegativeIntHeader(headers: Headers, name: string): number | null {
  const value = headers.get(name)?.trim();
  return value && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
}

function retryAfterSeconds(value: string | null): number | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  if (/^\d+$/.test(normalized)) return Number(normalized);
  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? null : Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
}

function nextPage(headers: Headers, requestUrl: URL): number | null {
  const rawNextPage = headers.get("x-next-page")?.trim();
  if (rawNextPage) {
    if (!/^[1-9]\d*$/.test(rawNextPage) || !Number.isSafeInteger(Number(rawNextPage))) throw invalidPagination();
    return Number(rawNextPage);
  }
  const link = headers.get("link");
  if (!link) return null;
  const next = link.split(/,(?=\s*<)/).find((entry) => /(?:^|;)\s*rel\s*=\s*(?:"next"|next)(?:\s*;|\s*$)/i.test(entry));
  if (!next) return null;
  const match = /^\s*<([^>]+)>/.exec(next);
  if (!match?.[1]) throw invalidPagination();
  let url: URL;
  try { url = new URL(match[1], requestUrl); } catch { throw invalidPagination(); }
  const page = url.searchParams.get("page");
  if (url.origin !== requestUrl.origin || url.pathname !== requestUrl.pathname || !page || !/^[1-9]\d*$/.test(page) || !Number.isSafeInteger(Number(page))) throw invalidPagination();
  return Number(page);
}

function invalidPagination(): ConnectorError { return new ConnectorError("gitlab", "malformed_response", "GitLab returned invalid pagination metadata", false, 200); }
function isJsonContentType(value: string | null): boolean { return value !== null && /^(?:application\/json|[^;\s]+\/[^;\s]+\+json)(?:\s*;|$)/i.test(value.trim()); }
function contentTypeCategory(value: string | null): string { return value === null ? "missing" : isJsonContentType(value) ? "json" : "non-json"; }
function classifyStatus(status: number, remaining: number | null): { code: ConstructorParameters<typeof ConnectorError>[1]; retryable: boolean } {
  if (status === 401) return { code: "authentication", retryable: false };
  if (status === 403 && remaining === 0) return { code: "rate_limited", retryable: true };
  if (status === 403) return { code: "authorization", retryable: false };
  if (status === 404) return { code: "not_found", retryable: false };
  if (status === 400 || status === 422) return { code: "validation", retryable: false };
  if (status === 429) return { code: "rate_limited", retryable: true };
  if (status >= 500) return { code: "provider", retryable: true };
  return { code: "provider", retryable: false };
}
