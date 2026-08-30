import { describe, expect, it } from "vitest";
import type { PlatformConnector } from "../../connectors/core/connector.interface.js";
import { ConnectorError } from "../../connectors/core/connector.errors.js";
import { ConnectorRegistry } from "../../connectors/core/connectorRegistry.js";
import { emptyMetrics, type NormalizedItem } from "../../types/normalizedItem.js";
import { SearchService } from "./search.service.js";

function connector(id: string, search: PlatformConnector["search"]): PlatformConnector {
  return {
    id, name: id, version: "1.0.0",
    capabilities: { search: true, itemDetails: false, comments: false, repositories: true, users: false, issues: false, pullRequests: false, releases: false, commits: false, changeTracking: false },
    validateConfig: async () => undefined,
    search,
    fetchItem: async () => { throw new Error("unsupported"); },
    fetchUpdates: async () => { throw new Error("unsupported"); },
    getRateLimitStatus: () => ({ limit: null, remaining: null, resetAt: null, retryAfterSeconds: null }),
    getHealth: () => ({ status: "healthy", message: null, lastSuccessfulRequestAt: null })
  };
}

describe("SearchService", () => {
  it("returns successful results when another connector fails", async () => {
    const registry = new ConnectorRegistry();
    const item: NormalizedItem = {
      id: "good:1", source: "good", sourceId: "1", sourceType: "repository", title: "Result", description: null,
      url: "https://example.test/result", author: null, metrics: emptyMetrics(), tags: [], language: null,
      createdAt: null, updatedAt: null, publishedAt: null, collectedAt: new Date().toISOString(), rawDataReference: null,
      provenance: { source: "good", sourceId: "1", sourceUrl: "https://example.test/result", connectorVersion: "1", requestId: "request", jobId: null, collectedAt: new Date().toISOString() }, metadata: {}
    };
    registry.register(connector("good", async () => ({ items: [item], rawItems: [], total: 1, hasMore: false, rateLimit: { limit: null, remaining: null, resetAt: null, retryAfterSeconds: null } })));
    registry.register(connector("bad", async () => { throw new ConnectorError("bad", "provider", "Provider unavailable", true); }));
    const service = new SearchService(registry, 2);
    const result = await service.search({ query: "result", sources: ["good", "bad"], types: ["repository"], filters: {}, sort: "relevance", page: 1, perPage: 20 }, "request");
    expect(result.status).toBe("partially_completed");
    expect(result.results).toHaveLength(1);
    expect(result.sourceStatus).toEqual(expect.arrayContaining([expect.objectContaining({ source: "bad", status: "failed" })]));
  });
});
