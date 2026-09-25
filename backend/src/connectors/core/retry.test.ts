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
});
