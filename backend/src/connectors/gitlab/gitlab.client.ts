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
    let response: Response;
    try {
      const timeout = AbortSignal.timeout(this.options.timeoutMs);
      response = await this.#fetch(new URL(path.replace(/^\//, ""), ensureTrailingSlash(this.options.baseUrl)), { headers, signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
    } catch (error) {
      if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) throw new ConnectorError("gitlab", "timeout", "GitLab request timed out", true);
      throw new ConnectorError("gitlab", "network", "GitLab request failed at the network boundary", true);
    }
    this.#rateLimit = parseRateLimit(response.headers);
    const text = await response.text();
    let body: unknown = null;
    if (text) { try { body = JSON.parse(text); } catch { throw new ConnectorError("gitlab", "malformed_response", "GitLab returned malformed JSON", false, response.status); } }
    if (!response.ok) {
      const message = typeof body === "object" && body !== null && "message" in body ? String(body.message).slice(0, 300) : `HTTP ${response.status}`;
      const mapped = classifyStatus(response.status, this.#rateLimit.remaining);
      throw new ConnectorError("gitlab", mapped.code, `GitLab API: ${message}`, mapped.retryable, response.status, this.#rateLimit.retryAfterSeconds);
    }
    return { body: body as T, total: intHeader(response.headers, "x-total"), nextPage: intHeader(response.headers, "x-next-page") };
  }
}

function ensureTrailingSlash(value: string): string { return value.endsWith("/") ? value : `${value}/`; }

function parseRateLimit(headers: Headers): RateLimitStatus {
  const resetRaw = intHeader(headers, "ratelimit-reset") ?? intHeader(headers, "x-ratelimit-reset");
  return {
    limit: intHeader(headers, "ratelimit-limit") ?? intHeader(headers, "x-ratelimit-limit"),
    remaining: intHeader(headers, "ratelimit-remaining") ?? intHeader(headers, "x-ratelimit-remaining"),
    resetAt: resetRaw === null ? null : new Date(resetRaw * 1000).toISOString(),
    retryAfterSeconds: intHeader(headers, "retry-after"),
    used: intHeader(headers, "ratelimit-observed") ?? intHeader(headers, "x-ratelimit-used")
  };
}

function intHeader(headers: Headers, name: string): number | null { const value = headers.get(name); return value && /^\d+$/.test(value) ? Number(value) : null; }
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
