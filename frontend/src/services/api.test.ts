import { describe, expect, it, vi } from "vitest";
import { authLogin, buildApiUrl, createCollection, listConnectors, searchExportUrl } from "./api";

describe("API response handling", () => {
  it("reports empty proxy responses as an API error instead of throwing JSON parse errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 502 })));
    await expect(listConnectors()).rejects.toThrow("API unavailable (502)");
    vi.unstubAllGlobals();
  });

  it("uses cookie credentials and a session CSRF header without browser storage", async () => {
    const local = vi.spyOn(Storage.prototype, "setItem");
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => new Response(JSON.stringify({ success: true, data: url.endsWith("/csrf") ? { token: "session-bound-csrf" } : url.endsWith("/login") ? { email: "owner@example.test" } : { name: "Research" } }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await authLogin("owner@example.test", "correct horse battery staple");
    await createCollection({ name: "Research", description: "" });
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/csrf", expect.objectContaining({ credentials: "include" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/collections", expect.objectContaining({ credentials: "include", headers: expect.objectContaining({ "x-csrf-token": "session-bound-csrf" }) }));
    expect(local).not.toHaveBeenCalled();
    local.mockRestore(); vi.unstubAllGlobals();
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
