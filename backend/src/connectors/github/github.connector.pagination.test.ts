import { describe, expect, it, vi } from "vitest";
import { GitHubClient } from "./github.client.js";
import { GitHubConnector } from "./github.connector.js";
import type { GitHubRepository } from "./github.types.js";

function repository(id: number): GitHubRepository { return { id, name: `repo-${id}`, full_name: `owner/repo-${id}`, description: null, html_url: `https://github.test/owner/repo-${id}`, owner: { id: 1, login: "owner", avatar_url: "https://github.test/avatar", html_url: "https://github.test/owner" }, language: "TypeScript", stargazers_count: id, forks_count: 0, watchers_count: 0, open_issues_count: 0, topics: [], license: null, default_branch: "main", created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-02T00:00:00Z", pushed_at: null, archived: false, fork: false, visibility: "public", homepage: null, size: 1 }; }

describe("GitHub repository pagination", () => {
  it("uses page size 100 and continues sequentially", async () => {
    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const page = Number(new URL(String(input)).searchParams.get("page"));
      const count = page === 1 ? 100 : 50;
      return new Response(JSON.stringify({ total_count: 150, incomplete_results: false, items: Array.from({ length: count }, (_, index) => repository((page - 1) * 100 + index + 1)) }), { status: 200, headers: { "x-ratelimit-limit": "30", "x-ratelimit-remaining": "29" } });
    }) as typeof fetch;
    const connector = new GitHubConnector(new GitHubClient({ baseUrl: "https://api.github.test", apiVersion: "2022-11-28", timeoutMs: 5000, fetchImpl }));
    const batches = [];
    for await (const batch of connector.searchRepositories({ query: "agent", sources: ["github"], filters: {}, sort: { field: "relevance", direction: "desc" }, collectionMode: "expanded", resultLimit: 150 }, { requestId: "request", jobId: "job", signal: new AbortController().signal })) batches.push(batch);
    expect(batches.map((batch) => batch.repositories.length)).toEqual([100, 50]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
