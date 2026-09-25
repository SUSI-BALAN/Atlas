import { describe, expect, it, vi } from "vitest";
import { GitLabClient } from "./gitlab.client.js";
import { GitLabConnector } from "./gitlab.connector.js";

const project = {
  id: 8, name: "collector", name_with_namespace: "Open / Collector", path_with_namespace: "open/collector",
  description: "Information collector", web_url: "https://gitlab.com/open/collector", forks_count: 2, star_count: 10,
  created_at: "2025-01-01T00:00:00Z", last_activity_at: "2025-03-01T00:00:00Z",
  namespace: { id: 3, name: "Open", full_path: "open", web_url: "https://gitlab.com/open" }, topics: ["research"]
};

describe("GitLabConnector", () => {
  it("uses the official projects endpoint and maps public projects", async () => {
    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v4/projects");
      expect(url.searchParams.get("visibility")).toBe("public");
      expect(url.searchParams.get("search")).toBe("collector");
      expect(new Headers(init?.headers).has("private-token")).toBe(false);
      return new Response(JSON.stringify([project]), { status: 200, headers: { "content-type": "application/json", "x-total": "1", "x-next-page": "" } });
    }) as typeof fetch;
    const connector = new GitLabConnector(new GitLabClient({ baseUrl: "https://gitlab.com/api/v4/", timeoutMs: 5000, fetchImpl }));
    const result = await connector.search({ query: "collector", types: ["repository"], filters: {}, sort: "relevance", page: 1, perPage: 20 }, { requestId: "request-2", jobId: null });
    expect(result.items[0]).toMatchObject({ source: "gitlab", sourceId: "8", title: "Open / Collector" });
    expect(result.items[0]?.provenance.sourceUrl).toBe(project.web_url);
    expect(result.total).toBe(1);
    expect(connector.getHealth()).toMatchObject({ status: "healthy" });
  });

  it("uses the configured GitLab source URL in public connector metadata", () => {
    const connector = new GitLabConnector(new GitLabClient({ baseUrl: "https://gitlab.test/api/v4/", timeoutMs: 5000, fetchImpl: fetch }), { homepageUrl: "https://gitlab.test/" });
    expect(connector.homepageUrl).toBe("https://gitlab.test/");
  });

  it("continues through GitLab X-Next-Page pagination", async () => {
    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const page = Number(new URL(String(input)).searchParams.get("page"));
      return new Response(JSON.stringify([{ ...project, id: page, name: `collector-${page}`, name_with_namespace: `Open / Collector ${page}`, path_with_namespace: `open/collector-${page}`, web_url: `https://gitlab.test/open/collector-${page}` }]), { status: 200, headers: { "x-total": "2", "x-next-page": page === 1 ? "2" : "" } });
    }) as typeof fetch;
    const connector = new GitLabConnector(new GitLabClient({ baseUrl: "https://gitlab.test/api/v4/", timeoutMs: 5000, fetchImpl }));
    const batches = [];
    for await (const batch of connector.searchRepositories({ query: "collector", sources: ["gitlab"], filters: {}, sort: { field: "relevance", direction: "desc" }, collectionMode: "all", resultLimit: null }, { requestId: "request", jobId: "job", signal: new AbortController().signal })) batches.push(batch);
    expect(batches).toHaveLength(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
