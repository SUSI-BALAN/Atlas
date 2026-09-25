import { describe, expect, it, vi } from "vitest";
import { ForgeClient } from "./forge.client.js";
import { ForgeConnector } from "./forge.connector.js";

const repository = {
  id: 42, name: "research", full_name: "team/research", description: "Universal research tools",
  html_url: "https://codeberg.org/team/research", owner: { id: 7, login: "team", html_url: "https://codeberg.org/team" },
  language: "TypeScript", stars_count: 12, forks_count: 3, watchers_count: 4, open_issues_count: 1,
  topics: ["research"], created_at: "2025-01-01T00:00:00Z", updated_at: "2025-02-01T00:00:00Z"
};

describe("ForgeConnector", () => {
  it("searches the configured Gitea-compatible API and preserves source provenance", async () => {
    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/repos/search");
      expect(url.searchParams.get("q")).toBe("research tools");
      expect(new Headers(init?.headers).has("authorization")).toBe(false);
      return new Response(JSON.stringify({ ok: true, data: [repository] }), { status: 200, headers: { "content-type": "application/json", "x-total-count": "1" } });
    }) as typeof fetch;
    const connector = new ForgeConnector(new ForgeClient({ connectorId: "codeberg", providerName: "Codeberg", baseUrl: "https://codeberg.org/api/v1/", timeoutMs: 5000, fetchImpl }), { id: "codeberg", name: "Codeberg", homepageUrl: "https://codeberg.org/explore/repos" });
    const result = await connector.search({ query: "research tools", types: ["repository"], filters: {}, sort: "relevance", page: 1, perPage: 20 }, { requestId: "request-1", jobId: null });
    expect(result.items[0]).toMatchObject({ source: "codeberg", sourceId: "42", title: "team/research", language: "TypeScript" });
    expect(result.items[0]?.provenance.sourceUrl).toBe(repository.html_url);
    expect(result.rawItems[0]?.data).toEqual(repository);
    expect(connector.getHealth()).toMatchObject({ status: "healthy" });
  });

  it.each(["codeberg", "gitea", "forgejo"])("paginates %s sequentially until exhausted", async (id) => {
    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const page = Number(new URL(String(input)).searchParams.get("page"));
      const row = { ...repository, id: page, full_name: `team/research-${page}`, html_url: `https://${id}.test/team/research-${page}` };
      return new Response(JSON.stringify({ ok: true, data: page <= 2 ? [row] : [] }), { status: 200, headers: { "x-total-count": "100" } });
    }) as typeof fetch;
    const connector = new ForgeConnector(new ForgeClient({ connectorId: id, providerName: id, baseUrl: `https://${id}.test/api/v1/`, timeoutMs: 5000, fetchImpl }), { id, name: id, homepageUrl: `https://${id}.test`, enabled: true });
    const batches = [];
    for await (const batch of connector.searchRepositories({ query: "research", sources: [id as "codeberg"], filters: {}, sort: { field: "relevance", direction: "desc" }, collectionMode: "all", resultLimit: null }, { requestId: "request", jobId: "job", signal: new AbortController().signal })) batches.push(batch);
    expect(batches.flatMap((batch) => batch.repositories)).toHaveLength(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
