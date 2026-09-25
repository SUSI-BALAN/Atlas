import { describe, expect, it, vi } from "vitest";
import { buildApiUrl, listConnectors, searchExportUrl } from "./api";

describe("API response handling", () => {
  it("reports empty proxy responses as an API error instead of throwing JSON parse errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 502 })));
    await expect(listConnectors()).rejects.toThrow("API unavailable (502)");
    vi.unstubAllGlobals();
  });
});

describe("API URL selection", () => {
  it("keeps relative URLs for local Vite proxy mode", () => {
    expect(buildApiUrl("/api/health", "")).toBe("/api/health");
  });

  it("builds remote production URLs without embedding localhost", () => {
    expect(buildApiUrl("/api/health", "https://atlas-api.example.com/"))
      .toBe("https://atlas-api.example.com/api/health");
    expect(buildApiUrl("api/health", "https://atlas-api.example.com/base/"))
      .toBe("https://atlas-api.example.com/base/api/health");
  });

  it("uses the same URL builder for exports", () => {
    expect(searchExportUrl("507f1f77bcf86cd799439011", "csv"))
      .toBe("/api/search/jobs/507f1f77bcf86cd799439011/export?format=csv");
  });

  it("rejects credentials in the configured API base URL", () => {
    expect(() => buildApiUrl("/api/health", "https://user:pass@example.com"))
      .toThrow("clean HTTP(S) origin or base path");
  });
});
