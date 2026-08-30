import { describe, expect, it } from "vitest";
import { deduplicate } from "./deduplicate.js";
import type { NormalizedItem } from "../../types/normalizedItem.js";

describe("deduplicate", () => {
  it("deduplicates exact canonical URLs while retaining duplicate provenance", () => {
    const base = {
      id: "a", source: "one", sourceId: "1", sourceType: "article", title: "A", description: null,
      url: "https://example.test/item?utm_source=test", author: null,
      metrics: { views: null, stars: null, forks: null, likes: null, comments: null, shares: null, watchers: null, openIssues: null },
      tags: [], language: null, createdAt: null, updatedAt: null, publishedAt: null,
      collectedAt: "2024-01-01T00:00:00Z", rawDataReference: null,
      provenance: { source: "one", sourceId: "1", sourceUrl: "https://example.test/item", connectorVersion: "1", requestId: "r", jobId: null, collectedAt: "2024-01-01T00:00:00Z" },
      metadata: {}
    } satisfies NormalizedItem;
    const duplicate: NormalizedItem = { ...base, id: "b", source: "two", sourceId: "2", url: "https://example.test/item", metadata: {}, provenance: { ...base.provenance, source: "two", sourceId: "2" } };
    const result = deduplicate([base, duplicate]);
    expect(result).toHaveLength(1);
    expect(result[0]?.metadata.duplicateProvenance).toHaveLength(1);
  });
});
