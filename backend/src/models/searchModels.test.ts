import { describe, expect, it } from "vitest";
import { RepositoryResultModel } from "./repositoryResult.model.js";
import { SearchCacheModel } from "./searchCache.model.js";
import { SearchJobModel } from "./searchJob.model.js";

describe("search persistence indexes", () => {
  it("enforces per-job source identity and cache expiry indexes", () => {
    expect(RepositoryResultModel.schema.indexes()).toEqual(expect.arrayContaining([
      [{ jobId: 1, source: 1, externalId: 1 }, expect.objectContaining({ unique: true })]
    ]));
    expect(SearchJobModel.schema.indexes()).toEqual(expect.arrayContaining([[{ createdAt: -1 }, expect.any(Object)]]));
    expect(SearchCacheModel.schema.indexes()).toEqual(expect.arrayContaining([
      [{ expiresAt: 1 }, expect.objectContaining({ expireAfterSeconds: 0 })]
    ]));
  });
});
