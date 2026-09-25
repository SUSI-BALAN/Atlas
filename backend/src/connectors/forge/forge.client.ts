import { ConnectorError } from "../core/connector.errors.js";
import type { RateLimitStatus } from "../core/connector.types.js";

export interface ForgeClientOptions {
  connectorId: string;
  providerName: string;
  baseUrl: string;
  token?: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

export interface ForgeResponse<T> {
  body: T;
  total: number | null;
}

const emptyRateLimit = (): RateLimitStatus => ({ limit: null, remaining: null, resetAt: null, retryAfterSeconds: null });

export class ForgeClient {
  #rateLimit = emptyRateLimit();
  readonly #fetch: typeof fetch;

  constructor(private readonly options: ForgeClientOptions) {
    this.#fetch = options.fetchImpl ?? fetch;
  }

  getRateLimitStatus(): RateLimitStatus {
    return { ...this.#rateLimit };
  }

  async get<T>(path: string, signal?: AbortSignal): Promise<ForgeResponse<T>> {
    const timeout = AbortSignal.timeout(this.options.timeoutMs);
    const headers: Record<string, string> = { Accept: "application/json", "User-Agent": "universal-internet-platform-information-collector" };
    if (this.options.token) headers.Authorization = `token ${this.options.token}`;

    let response: Response;
    try {
      response = await this.#fetch(new URL(path.replace(/^\//, ""), ensureTrailingSlash(this.options.baseUrl)), {
        headers,
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
        throw new ConnectorError(this.options.connectorId, "timeout", `${this.options.providerName} request timed out`, true);
      }
      throw new ConnectorError(this.options.connectorId, "network", `${this.options.providerName} request failed at the network boundary`, true);
    }

    this.#rateLimit = rateLimitFromHeaders(response.headers);
    const text = await response.text();
    let body: unknown = null;
    if (text) {
      try { body = JSON.parse(text); } catch {
        throw new ConnectorError(this.options.connectorId, "malformed_response", `${this.options.providerName} returned malformed JSON`, false, response.status);
      }
    }
    if (!response.ok) {
      const message = providerMessage(body, response.status);
      const classification = classifyStatus(response.status, this.#rateLimit.remaining);
      throw new ConnectorError(this.options.connectorId, classification.code, `${this.options.providerName} API: ${message}`, classification.retryable, response.status, this.#rateLimit.retryAfterSeconds);
    }

    return { body: body as T, total: integerHeader(response.headers, "x-total-count") };
  }
}

function ensureTrailingSlash(value: string): string { return value.endsWith("/") ? value : `${value}/`; }

function providerMessage(body: unknown, status: number): string {
  if (typeof body === "object" && body !== null && "message" in body && typeof body.message === "string") return body.message.slice(0, 300);
  return `HTTP ${status}`;
}

function rateLimitFromHeaders(headers: Headers): RateLimitStatus {
  const resetSeconds = integerHeader(headers, "x-ratelimit-reset");
  const retryAfterSeconds = integerHeader(headers, "retry-after");
  return {
    limit: integerHeader(headers, "x-ratelimit-limit"),
    remaining: integerHeader(headers, "x-ratelimit-remaining"),
    resetAt: resetSeconds === null ? null : new Date(resetSeconds * 1000).toISOString(),
    retryAfterSeconds
    ,used: integerHeader(headers, "x-ratelimit-used")
  };
}

function integerHeader(headers: Headers, name: string): number | null {
  const raw = headers.get(name);
  if (!raw || !/^\d+$/.test(raw)) return null;
  return Number(raw);
}

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
