import { describe, expect, it } from "vitest";
import { emptyMetrics, type NormalizedItem } from "../../types/normalizedItem.js";
import { rankItems } from "./rank.js";

function item(source: string, id: string, title: string): NormalizedItem {
  const collectedAt = "2025-01-01T00:00:00Z";
  return {
    id: `${source}:${id}`, source, sourceId: id, sourceType: "repository", title, description: null,
    url: `https://${source}.test/${id}`, author: null, metrics: emptyMetrics(), tags: [], language: null,
    createdAt: null, updatedAt: null, publishedAt: null, collectedAt, rawDataReference: null,
    provenance: { source, sourceId: id, sourceUrl: `https://${source}.test/${id}`, connectorVersion: "1", requestId: "request", jobId: null, collectedAt }, metadata: {}
  };
}

describe("rankItems", () => {
  it("interleaves sources so one large provider does not hide smaller-source matches", () => {
    const ranked = rankItems(
      [item("github", "1", "research"), item("github", "2", "research"), item("github", "3", "research"), item("gitlab", "1", "research"), item("codeberg", "1", "research")],
      { query: "research", sources: ["github", "gitlab", "codeberg"], types: ["repository"], filters: {}, sort: "relevance", page: 1, perPage: 3 }
    );
    expect(ranked.slice(0, 3).map((entry) => entry.source)).toEqual(["github", "gitlab", "codeberg"]);
  });
});
