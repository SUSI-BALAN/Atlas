import { describe, expect, it, vi } from "vitest";
import type { PlatformConnector } from "../../connectors/core/connector.interface.js";
import { ConnectorRegistry } from "../../connectors/core/connectorRegistry.js";
import type { NormalizedRepository, RepositorySearchBatch } from "../../types/repositorySearch.js";
import { SearchJobService } from "./searchJob.service.js";

function repository(id: string): NormalizedRepository { return { id: `github:${id}`, source: "github", externalId: id, owner: "owner", name: `repo-${id}`, fullName: `owner/repo-${id}`, description: null, repositoryUrl: `https://github.test/owner/repo-${id}`, cloneUrl: null, defaultBranch: "main", language: null, languages: [], topics: [], stars: 0, forks: 0, watchers: null, openIssues: null, license: null, createdAt: null, updatedAt: null, pushedAt: null, archived: false, fork: false, visibility: "public", sourceMetadata: {} }; }
function connector(stream: PlatformConnector["searchRepositories"]): PlatformConnector { return { id: "github", name: "GitHub", version: "1", homepageUrl: "https://github.test", accessMethod: "Test", enabled: true, authentication: "anonymous", capabilities: { search: true, itemDetails: false, comments: false, repositories: true, users: false, issues: false, pullRequests: false, releases: false, commits: false, changeTracking: false }, validateConfig: async () => undefined, search: async () => { throw new Error("unused"); }, fetchItem: async () => { throw new Error("unused"); }, fetchUpdates: async () => { throw new Error("unused"); }, getRateLimitStatus: () => ({ limit: null, remaining: null, resetAt: null, retryAfterSeconds: null }), getHealth: () => ({ status: "healthy", message: null, lastSuccessfulRequestAt: null }), searchRepositories: stream }; }
function batch(rows: NormalizedRepository[]): RepositorySearchBatch { return { source: "github", page: 1, repositories: rows, rawRepositories: [], total: rows.length, hasMore: false, rateLimit: { limit: 60, remaining: 59, resetAt: null, retryAfterSeconds: null }, partition: null, durationMs: 1 }; }

describe("SearchJobService", () => {
  it("tracks progressive job completion and deduplicates same-source repositories", async () => {
    const registry = new ConnectorRegistry();
    registry.register(connector(async function* () { yield batch([repository("1"), repository("1"), repository("2")]); }));
    const service = new SearchJobService(registry, 1);
    const created = await service.create({ query: "agent", sources: ["github"], filters: {}, sort: { field: "relevance", direction: "desc" }, collectionMode: "preview", resultLimit: 50 }, "request");
    await vi.waitFor(async () => expect((await service.get(created.jobId)).status).toBe("completed"));
    const result = await service.results(created.jobId, undefined, 50);
    expect(result.results.map((item) => item.externalId)).toEqual(["1", "2"]);
    expect((await service.get(created.jobId)).totalUnique).toBe(2);
  });

  it("cancels an active connector generator", async () => {
    const registry = new ConnectorRegistry();
    registry.register(connector(async function* (_request, context) { yield batch([repository("1")]); await new Promise<void>((_resolve, reject) => context.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true })); }));
    const service = new SearchJobService(registry, 1);
    const created = await service.create({ query: "agent", sources: ["github"], filters: {}, sort: { field: "relevance", direction: "desc" }, collectionMode: "expanded", resultLimit: 500 }, "request");
    await vi.waitFor(async () => expect((await service.get(created.jobId)).status).toBe("running"));
    await service.cancel(created.jobId);
    await vi.waitFor(async () => expect((await service.get(created.jobId)).status).toBe("cancelled"));
  });
});
