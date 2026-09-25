import { ConnectorError } from "./connector.errors.js";

export interface RetryOptions { maxRetries?: number; baseDelayMs?: number; maxDelayMs?: number; signal: AbortSignal; onRetry?: (retry: number, delayMs: number, error: ConnectorError) => void; }

export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  const maxRetries = options.maxRetries ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 30_000;
  for (let retry = 0; ; retry += 1) {
    try { return await operation(); } catch (error) {
      if (!(error instanceof ConnectorError) || !error.retryable || retry >= maxRetries) throw error;
      const providerDelay = error.retryAfterSeconds === null ? 0 : error.retryAfterSeconds * 1000;
      const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** retry);
      const delayMs = Math.max(providerDelay, Math.round(exponential * (0.75 + Math.random() * 0.5)));
      options.onRetry?.(retry + 1, delayMs, error);
      await abortableDelay(delayMs, options.signal);
    }
  }
}

export async function abortableDelay(delayMs: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(resolve, delayMs);
    signal.addEventListener("abort", () => { clearTimeout(timeout); reject(signal.reason ?? new DOMException("Aborted", "AbortError")); }, { once: true });
  });
}
