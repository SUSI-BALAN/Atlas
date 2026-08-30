import { ConnectorError } from "../core/connector.errors.js";
import type { RateLimitStatus } from "../core/connector.types.js";
import { emptyRateLimit, rateLimitFromHeaders } from "./github.rateLimit.js";

export interface GitHubClientOptions {
  baseUrl: string;
  apiVersion: string;
  token?: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

export class GitHubClient {
  #rateLimit: RateLimitStatus = emptyRateLimit();
  readonly #fetch: typeof fetch;

  constructor(private readonly options: GitHubClientOptions) {
    this.#fetch = options.fetchImpl ?? fetch;
  }

  getRateLimitStatus(): RateLimitStatus {
    return { ...this.#rateLimit };
  }

  async get<T>(path: string, signal?: AbortSignal): Promise<T> {
    const timeout = AbortSignal.timeout(this.options.timeoutMs);
    const combinedSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": this.options.apiVersion,
      "User-Agent": "universal-internet-platform-information-collector"
    };
    if (this.options.token) headers.Authorization = `Bearer ${this.options.token}`;

    let response: Response;
    try {
      response = await this.#fetch(new URL(path, this.options.baseUrl), { headers, signal: combinedSignal });
    } catch (error) {
      if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
        throw new ConnectorError("github", "timeout", "GitHub request timed out", true);
      }
      throw new ConnectorError("github", "network", "GitHub request failed at the network boundary", true);
    }

    this.#rateLimit = rateLimitFromHeaders(response.headers);
    const text = await response.text();
    let body: unknown = null;
    if (text) {
      try { body = JSON.parse(text); } catch {
        throw new ConnectorError("github", "malformed_response", "GitHub returned malformed JSON", false, response.status);
      }
    }

    if (!response.ok) {
      const providerMessage = typeof body === "object" && body !== null && "message" in body && typeof body.message === "string"
        ? body.message.slice(0, 300)
        : `HTTP ${response.status}`;
      const mapping = classifyStatus(response.status, this.#rateLimit.remaining);
      throw new ConnectorError("github", mapping.code, `GitHub API: ${providerMessage}`, mapping.retryable, response.status, this.#rateLimit.retryAfterSeconds);
    }

    return body as T;
  }
}

function classifyStatus(status: number, remaining: number | null): { code: ConstructorParameters<typeof ConnectorError>[1]; retryable: boolean } {
  if (status === 401) return { code: "authentication", retryable: false };
  if (status === 403 && remaining === 0) return { code: "rate_limited", retryable: true };
  if (status === 403) return { code: "authorization", retryable: false };
  if (status === 404) return { code: "not_found", retryable: false };
  if (status === 422 || status === 400) return { code: "validation", retryable: false };
  if (status === 429) return { code: "rate_limited", retryable: true };
  if (status >= 500) return { code: "provider", retryable: true };
  return { code: "provider", retryable: false };
}
