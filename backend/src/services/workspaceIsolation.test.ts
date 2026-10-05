import { afterEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";
import { ConnectorRegistry } from "../connectors/core/connectorRegistry.js";
import { SavedRepositoryModel } from "../models/savedRepository.model.js";
import { CollectionModel } from "../models/collection.model.js";
import { WatchlistModel } from "../models/watchlist.model.js";
import { ChangeEventModel } from "../models/changeEvent.model.js";
import { RepositoryResultModel } from "../models/repositoryResult.model.js";
import { WorkspaceService } from "./workspace.service.js";
import { WatchService } from "./watch/watch.service.js";
import { AnalyticsService } from "./analytics/analytics.service.js";
import { AIResearchService } from "./ai/aiResearch.service.js";
import { ContextBuilderService } from "./ai/contextBuilder.service.js";
import { runInWorkspace } from "./workspaceContext.js";

const id = new Types.ObjectId("507f191e810c19729de860ea");
const foreign = { _id: id, workspaceKey: "workspace-b", source: "github", externalId: "1", name: "foreign", fullName: "foreign/repo" };
const matching = (query: { workspaceKey?: string }) => ({ lean: async () => query.workspaceKey === foreign.workspaceKey ? foreign : null });
afterEach(() => vi.restoreAllMocks());

describe("workspace A/B authorization in persistence services", () => {
  it("does not load B's saved repository or save B's result", async () => {
    const savedQuery = vi.spyOn(SavedRepositoryModel, "findOne").mockImplementation((query: never) => matching(query) as never);
    const resultQuery = vi.spyOn(RepositoryResultModel, "findOne").mockImplementation((query: never) => matching(query) as never);
    const service = new WorkspaceService();
    await expect(runInWorkspace("workspace-a", () => service.get(String(id)))).rejects.toMatchObject({ status: 404 });
    await expect(runInWorkspace("workspace-a", () => service.save(String(id), String(id)))).rejects.toMatchObject({ status: 404 });
    expect(savedQuery).toHaveBeenCalledWith(expect.objectContaining({ workspaceKey: "workspace-a" }));
    expect(resultQuery).toHaveBeenCalledWith(expect.objectContaining({ workspaceKey: "workspace-a" }));
  });

  it("does not load B's collection, watchlist or change event", async () => {
    vi.spyOn(CollectionModel, "findOne").mockImplementation((query: never) => matching(query) as never);
    vi.spyOn(WatchlistModel, "findOne").mockImplementation((query: never) => matching(query) as never);
    vi.spyOn(ChangeEventModel, "findOne").mockImplementation((query: never) => matching(query) as never);
    await expect(runInWorkspace("workspace-a", () => new WorkspaceService().getCollection(String(id)))).rejects.toMatchObject({ status: 404 });
    const watch = new WatchService(new ConnectorRegistry());
    await expect(runInWorkspace("workspace-a", () => watch.get(String(id)))).rejects.toMatchObject({ status: 404 });
    await expect(runInWorkspace("workspace-a", () => watch.change(String(id)))).rejects.toMatchObject({ status: 404 });
  });

  it("does not load B's AI session", async () => {
    const findOne = vi.fn((query: { workspaceKey: string }) => matching(query));
    const service = new AIResearchService(undefined, undefined, { Session: { findOne }, Message: {} });
    await expect(runInWorkspace("workspace-a", () => service.get(String(id)))).rejects.toMatchObject({ status: 404 });
    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({ workspaceKey: "workspace-a" }));
  });

  it("filters B's selected saved context before building an AI citation", async () => {
    const find = vi.fn((query: { workspaceKey: string }) => ({ sort: () => ({ limit: () => ({ lean: async () => query.workspaceKey === "workspace-b" ? [foreign] : [] }) }) }));
    const models = { SavedRepositoryModel: { find } };
    const builder = new ContextBuilderService(models as never, {});
    const context = await runInWorkspace("workspace-a", () => builder.build({ savedIds: [String(id)], searchJobIds: [], collectionIds: [], watchlistIds: [], changeIds: [], includeAnalytics: false }));
    expect(context.sources).toEqual([]);
    expect(context.missingReferences).toEqual([`saved:${id}`]);
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ workspaceKey: "workspace-a" }));
  });

  it("starts analytics distribution with a workspace match", async () => {
    const aggregate = vi.fn(async (pipeline: Array<{ $match?: { workspaceKey: string } }>) => pipeline[0].$match?.workspaceKey === "workspace-a" ? [{ _id: "github", count: 1 }] : [{ _id: "gitlab", count: 99 }]);
    const service = new AnalyticsService({ RepositoryResultModel: { aggregate } });
    const result = await runInWorkspace("workspace-a", () => service.sources());
    expect(result.sources).toEqual([{ source: "github", count: 1, percentage: 100 }]);
    expect(aggregate.mock.calls[0][0][0]).toEqual({ $match: { workspaceKey: "workspace-a" } });
  });
});
