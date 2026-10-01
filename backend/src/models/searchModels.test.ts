import { describe, expect, it } from "vitest";
import { RepositoryResultModel } from "./repositoryResult.model.js";
import { SearchCacheModel } from "./searchCache.model.js";
import { SearchJobModel } from "./searchJob.model.js";
import { SavedRepositoryModel } from "./savedRepository.model.js";
import { CollectionMembershipModel, CollectionModel } from "./collection.model.js";
import { RawItemModel } from "./rawItem.model.js";
import { NormalizedItemModel } from "./normalizedItem.model.js";
import { SearchHistoryModel } from "./searchHistory.model.js";
import { WatchlistModel, WatchlistMembershipModel } from "./watchlist.model.js";
import { RepositoryWatchStateModel } from "./repositoryWatchState.model.js";
import { ChangeEventModel } from "./changeEvent.model.js";
import { WatchCheckRunModel } from "./watchCheckRun.model.js";
import { AIResearchSessionModel, AIResearchMessageModel } from "./aiResearch.model.js";

const ownedModels = [
  SearchJobModel, RepositoryResultModel, SearchCacheModel, RawItemModel,
  NormalizedItemModel, SearchHistoryModel, SavedRepositoryModel,
  CollectionModel, CollectionMembershipModel, WatchlistModel,
  WatchlistMembershipModel, RepositoryWatchStateModel, ChangeEventModel,
  WatchCheckRunModel, AIResearchSessionModel, AIResearchMessageModel
];

describe("explicit persisted workspace ownership", () => {
  it.each(ownedModels.map(model => [model.modelName, model] as const))(
    "%s rejects missing ownership and retains explicit ownership",
    async (_name, model) => {
      const missing = new model({});
      expect(missing.get("workspaceKey")).toBeUndefined();
      await expect(missing.validate(["workspaceKey"])).rejects.toMatchObject({
        errors: { workspaceKey: { kind: "required" } }
      });
      for (const workspaceKey of ["workspace-a", "workspace-b"]) {
        const owned = new model({ workspaceKey });
        await expect(owned.validate(["workspaceKey"])).resolves.toBeUndefined();
        expect(owned.get("workspaceKey")).toBe(workspaceKey);
      }
    }
  );
});

describe("search persistence indexes", () => {
  it("enforces per-job source identity and cache expiry indexes", () => {
    expect(RepositoryResultModel.schema.indexes()).toEqual(expect.arrayContaining([
      [{ jobId: 1, source: 1, externalId: 1 }, expect.objectContaining({ unique: true })]
    ]));
    expect(SearchJobModel.schema.indexes()).toEqual(expect.arrayContaining([[{ workspaceKey: 1, createdAt: -1, _id: -1 }, expect.any(Object)]]));
    expect(SearchCacheModel.schema.indexes()).toEqual(expect.arrayContaining([
      [{ expiresAt: 1 }, expect.objectContaining({ expireAfterSeconds: 0 })]
    ]));
    expect(SavedRepositoryModel.schema.indexes()).toEqual(expect.arrayContaining([[{ workspaceKey: 1, source: 1, externalId: 1 }, expect.objectContaining({ unique: true })]]));
    expect(CollectionModel.schema.indexes()).toEqual(expect.arrayContaining([[{ workspaceKey: 1, createdAt: -1, _id: -1 }, expect.any(Object)]]));
    expect(CollectionMembershipModel.schema.indexes()).toEqual(expect.arrayContaining([[{ workspaceKey: 1, collectionId: 1, savedId: 1 }, expect.objectContaining({ unique: true })]]));
  });
});
