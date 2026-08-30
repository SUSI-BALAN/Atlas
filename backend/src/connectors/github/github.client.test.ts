import { describe, expect, it, vi } from "vitest";
import { ConnectorError } from "../core/connector.errors.js";
import { GitHubClient } from "./github.client.js";

describe("GitHubClient", () => {
  it("captures rate limits and sends no authorization header without a token", async () => {
    const fetchImpl = vi.fn(async (_url: URL, init?: RequestInit) => {
      expect(new Headers(init?.headers).has("authorization")).toBe(false);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "x-ratelimit-limit": "60", "x-ratelimit-remaining": "59" } });
    });
    const client = new GitHubClient({ baseUrl: "https://api.github.test", apiVersion: "2022-11-28", timeoutMs: 1000, fetchImpl: fetchImpl as typeof fetch });
    await client.get("/test");
    expect(client.getRateLimitStatus()).toMatchObject({ limit: 60, remaining: 59 });
  });

  it("classifies invalid credentials as permanent", async () => {
    const client = new GitHubClient({
      baseUrl: "https://api.github.test", apiVersion: "2022-11-28", token: "secret", timeoutMs: 1000,
      fetchImpl: (async () => new Response(JSON.stringify({ message: "Bad credentials" }), { status: 401 })) as typeof fetch
    });
    await expect(client.get("/test")).rejects.toMatchObject<Partial<ConnectorError>>({ code: "authentication", retryable: false });
  });
});
