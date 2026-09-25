import { describe, expect, it, vi } from "vitest";
import { listConnectors } from "./api";

describe("API response handling", () => {
  it("reports empty proxy responses as an API error instead of throwing JSON parse errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 502 })));
    await expect(listConnectors()).rejects.toThrow("API unavailable (502)");
    vi.unstubAllGlobals();
  });
});
