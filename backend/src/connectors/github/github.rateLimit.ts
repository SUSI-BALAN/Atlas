import type { RateLimitStatus } from "../core/connector.types.js";

export const emptyRateLimit = (): RateLimitStatus => ({
  limit: null,
  remaining: null,
  resetAt: null,
  retryAfterSeconds: null
});

function headerNumber(headers: Headers, name: string): number | null {
  const value = headers.get(name);
  if (value === null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function rateLimitFromHeaders(headers: Headers): RateLimitStatus {
  const resetSeconds = headerNumber(headers, "x-ratelimit-reset");
  return {
    limit: headerNumber(headers, "x-ratelimit-limit"),
    remaining: headerNumber(headers, "x-ratelimit-remaining"),
    resetAt: resetSeconds === null ? null : new Date(resetSeconds * 1000).toISOString(),
    retryAfterSeconds: headerNumber(headers, "retry-after")
  };
}
