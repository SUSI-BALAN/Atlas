import { describe, expect, it, vi } from "vitest";
import { ConnectorError } from "./connector.errors.js";
import { withRetry } from "./retry.js";

describe("withRetry", () => {
  it("retries transient failures and stops on success", async () => {
    const operation = vi.fn().mockRejectedValueOnce(new ConnectorError("test", "network", "temporary", true)).mockResolvedValue("ok");
    await expect(withRetry(operation, { signal: new AbortController().signal, baseDelayMs: 0 })).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });
  it("does not retry permanent errors", async () => {
    const operation = vi.fn().mockRejectedValue(new ConnectorError("test", "validation", "invalid", false));
    await expect(withRetry(operation, { signal: new AbortController().signal, baseDelayMs: 0 })).rejects.toMatchObject({ code: "validation" });
    expect(operation).toHaveBeenCalledTimes(1);
  });
  it("stops after the configured number of transient retries", async () => {
    const operation = vi.fn().mockRejectedValue(new ConnectorError("gitlab", "provider", "temporary", true));
    await expect(withRetry(operation, { signal: new AbortController().signal, baseDelayMs: 0, maxRetries: 2 })).rejects.toMatchObject({ code: "provider" });
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("honors a provider retry delay without removing the retry bound", async () => {
    vi.useFakeTimers();
    const operation = vi.fn().mockRejectedValue(new ConnectorError("gitlab", "rate_limited", "limited", true, 429, 2));
    const promise = withRetry(operation, { signal: new AbortController().signal, baseDelayMs: 0, maxRetries: 1 });
    const rejection = expect(promise).rejects.toMatchObject({ code: "rate_limited" });
    await vi.advanceTimersByTimeAsync(2_000);
    await rejection;
    expect(operation).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
