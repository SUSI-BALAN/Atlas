import { describe, expect, it, vi } from "vitest";
import { ConnectorError } from "../../connectors/core/connector.errors.js";
import type { PlatformConnector } from "../../connectors/core/connector.interface.js";
import { ConnectorRegistry } from "../../connectors/core/connectorRegistry.js";
import type { NormalizedRepository, RepositorySearchBatch } from "../../types/repositorySearch.js";
import { SearchJobService } from "./searchJob.service.js";
import { RepositoryResultModel } from "../../models/repositoryResult.model.js";

function repository(id: string, source: "github" | "gitlab" = "github"): NormalizedRepository { return { id: `${source}:${id}`, source, externalId: id, owner: "owner", name: `repo-${id}`, fullName: `owner/repo-${id}`, description: null, repositoryUrl: `https://${source}.test/owner/repo-${id}`, cloneUrl: null, defaultBranch: "main", language: null, languages: [], topics: [], stars: 0, forks: 0, watchers: null, openIssues: null, license: null, createdAt: null, updatedAt: null, pushedAt: null, archived: false, fork: false, visibility: "public", sourceMetadata: {} }; }
function connector(stream: PlatformConnector["searchRepositories"], id: "github" | "gitlab" = "github"): PlatformConnector { return { id, name: id, version: "1", homepageUrl: `https://${id}.test`, accessMethod: "Test", enabled: true, authentication: "anonymous", capabilities: { search: true, itemDetails: false, comments: false, repositories: true, users: false, issues: false, pullRequests: false, releases: false, commits: false, changeTracking: false }, validateConfig: async () => undefined, search: async () => { throw new Error("unused"); }, fetchItem: async () => { throw new Error("unused"); }, fetchUpdates: async () => { throw new Error("unused"); }, getRateLimitStatus: () => ({ limit: null, remaining: null, resetAt: null, retryAfterSeconds: null }), getHealth: () => ({ status: "healthy", message: null, lastSuccessfulRequestAt: null }), searchRepositories: stream }; }
function batch(rows: NormalizedRepository[], page = 1): RepositorySearchBatch { return { source: rows[0]?.source ?? "github", page, repositories: rows, rawRepositories: [], total: rows.length, hasMore: false, rateLimit: { limit: 60, remaining: 59, resetAt: null, retryAfterSeconds: null }, partition: null, durationMs: 1 }; }

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

  it("keeps successful results when another source completes asynchronously with a permanent failure", async () => {
    const registry = new ConnectorRegistry();
    registry.register(connector(async function* () { yield batch([repository("1")]); }));
    registry.register(connector(async function* () {
      await new Promise((resolve) => setTimeout(resolve, 10));
      throw new ConnectorError("gitlab", "authorization", "Access denied", false);
    }, "gitlab"));
    const service = new SearchJobService(registry, 2);
    const created = await service.create({ query: "agent", sources: ["github", "gitlab"], filters: {}, sort: { field: "relevance", direction: "desc" }, collectionMode: "preview", resultLimit: 50 }, "request");

    await vi.waitFor(async () => expect((await service.get(created.jobId)).status).toBe("partially_complete"));
    const completed = await service.get(created.jobId);
    expect(completed.sourceProgress).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "github", status: "completed" }),
      expect.objectContaining({ source: "gitlab", status: "failed", error: expect.objectContaining({ retryable: false }) })
    ]));
    expect((await service.results(created.jobId, undefined, 50)).results.map((item) => item.externalId)).toEqual(["1"]);
  });

  it("returns stable non-overlapping cursor pages", async () => {
    const registry = new ConnectorRegistry();
    registry.register(connector(async function* () { yield batch([repository("1"), repository("2"), repository("3")]); }));
    const service = new SearchJobService(registry, 1);
    const created = await service.create({ query: "agent", sources: ["github"], filters: {}, sort: { field: "relevance", direction: "desc" }, collectionMode: "preview", resultLimit: 50 }, "request");
    await vi.waitFor(async () => expect((await service.get(created.jobId)).status).toBe("completed"));

    const first = await service.results(created.jobId, undefined, 2);
    const second = await service.results(created.jobId, first.nextCursor ?? undefined, 2);
    expect(first.results.map((item) => item.externalId)).toEqual(["1", "2"]);
    expect(first.hasMore).toBe(true);
    expect(second.results.map((item) => item.externalId)).toEqual(["3"]);
    expect(second.hasMore).toBe(false);
  });

  it("retries a partial failure without duplicating identities protected by the Mongo schema", async () => {
    let attempts = 0;
    const registry = new ConnectorRegistry();
    registry.register(connector(async function* () {
      attempts += 1;
      if (attempts === 1) {
        yield batch([repository("1")]);
        throw new ConnectorError("github", "network", "Temporary provider failure", true);
      }
      yield batch([repository("1"), repository("2")], 2);
    }));
    const service = new SearchJobService(registry, 1);
    const created = await service.create({ query: "agent", sources: ["github"], filters: {}, sort: { field: "relevance", direction: "desc" }, collectionMode: "preview", resultLimit: 50 }, "request");
    await vi.waitFor(async () => expect((await service.get(created.jobId)).status).toBe("failed"));

    await service.retrySource(created.jobId, "github", "retry-request");
    await vi.waitFor(async () => expect((await service.get(created.jobId)).status).toBe("completed"));
    expect(attempts).toBe(2);
    expect((await service.results(created.jobId, undefined, 50)).results.map((item) => item.externalId)).toEqual(["1", "2"]);
    expect(RepositoryResultModel.schema.indexes()).toEqual(expect.arrayContaining([
      [{ jobId: 1, source: 1, externalId: 1 }, expect.objectContaining({ unique: true })]
    ]));
    await expect(service.retrySource(created.jobId, "github", "duplicate-request")).rejects.toMatchObject({ status: 409, code: "SOURCE_NOT_RETRYABLE" });
  });
});
