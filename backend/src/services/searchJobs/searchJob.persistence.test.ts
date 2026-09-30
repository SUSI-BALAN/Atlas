import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";

const mocks = vi.hoisted(() => ({
  historyDocuments: [] as Record<string, unknown>[],
  interruptedDocuments: [] as Record<string, unknown>[],
  repositoryDocument: null as Record<string, unknown> | null,
  jobDocument: null as Record<string, unknown> | null,
  updateOne: vi.fn(),
  findOne: vi.fn(),
  deleteMany: vi.fn()
}));

vi.mock("../../database/mongoose.js", () => ({ isDatabaseConnected: () => true }));
vi.mock("../../models/searchJob.model.js", () => ({ SearchJobModel: {
  find: vi.fn((query: Record<string, unknown>) => {
    if ("status" in query) return { lean: async () => mocks.interruptedDocuments };
    return { sort: () => ({ limit: () => ({ lean: async () => mocks.historyDocuments }) }) };
  }),
  findById: vi.fn(() => ({ lean: async () => mocks.jobDocument })),
  updateOne: mocks.updateOne
} }));
vi.mock("../../models/repositoryResult.model.js", () => ({ RepositoryResultModel: {
  findOne: vi.fn((...args: unknown[]) => { mocks.findOne(...args); return { lean: async () => mocks.repositoryDocument }; }),
  deleteMany: mocks.deleteMany
} }));
vi.mock("../../models/searchCache.model.js", () => ({ SearchCacheModel: {} }));

import { ConnectorRegistry } from "../../connectors/core/connectorRegistry.js";
import { SearchJobService } from "./searchJob.service.js";

const request = { query: "atlas", sources: ["github", "gitlab"], filters: {}, sort: { field: "relevance", direction: "desc" }, collectionMode: "preview", resultLimit: 50 };
function job(id: string, createdAt: string) { return { _id: new Types.ObjectId(id), status: "completed", request, sourceProgress: [], totalUnique: 1, cancelRequested: false, cached: false, createdAt: new Date(createdAt), startedAt: new Date(createdAt), completedAt: new Date(createdAt) }; }

describe("durable search workflow persistence", () => {
  beforeEach(() => { mocks.historyDocuments = []; mocks.interruptedDocuments = []; mocks.repositoryDocument = null; mocks.jobDocument = job("507f1f77bcf86cd799439011", "2026-09-30T01:00:00Z"); vi.clearAllMocks(); });

  it("returns newest-first bounded history pages with an opaque continuation id", async () => {
    mocks.historyDocuments = [job("507f1f77bcf86cd799439012", "2026-09-30T02:00:00Z"), job("507f1f77bcf86cd799439011", "2026-09-30T01:00:00Z")];
    const page = await new SearchJobService(new ConnectorRegistry(), 1).list(undefined, 1);
    expect(page.jobs.map((item) => item.jobId)).toEqual(["507f1f77bcf86cd799439012"]);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe("507f1f77bcf86cd799439012");
  });

  it("looks up repository details with both job and repository identity", async () => {
    mocks.repositoryDocument = { _id: new Types.ObjectId("507f191e810c19729de860ea"), jobId: new Types.ObjectId("507f1f77bcf86cd799439011"), source: "github", externalId: "1", owner: "atlas", name: "core", fullName: "atlas/core", repositoryUrl: "https://example.test/atlas/core", stars: 1, forks: 0, sourceMetadata: { provenance: { requestId: "hidden" }, homepage: "https://example.test" } };
    const result = await new SearchJobService(new ConnectorRegistry(), 1).repository("507f1f77bcf86cd799439011", "507f191e810c19729de860ea");
    expect(result.repositoryId).toBe("507f191e810c19729de860ea");
    expect(result.sourceMetadata).toEqual({ homepage: "https://example.test" });
    expect(mocks.findOne).toHaveBeenCalledWith({ _id: expect.any(Types.ObjectId), jobId: expect.any(Types.ObjectId) });
  });

  it("returns missing for a repository that does not belong to the job", async () => {
    await expect(new SearchJobService(new ConnectorRegistry(), 1).repository("507f1f77bcf86cd799439011", "507f191e810c19729de860ea")).rejects.toMatchObject({ status: 404, code: "REPOSITORY_RESULT_NOT_FOUND" });
  });

  it("marks interrupted work retryable without deleting already persisted results", async () => {
    mocks.interruptedDocuments = [{ _id: new Types.ObjectId("507f1f77bcf86cd799439011"), status: "running", sourceProgress: [
      { source: "github", status: "completed", fetched: 1, pages: 1, total: 1, rateLimit: null, cursor: { page: 1, partition: null }, error: null, updatedAt: "2026-09-30T00:00:00Z" },
      { source: "gitlab", status: "running", fetched: 0, pages: 0, total: null, rateLimit: null, cursor: null, error: null, updatedAt: "2026-09-30T00:00:00Z" }
    ] }];
    expect(await new SearchJobService(new ConnectorRegistry(), 1).reconcileInterruptedJobs()).toBe(1);
    expect(mocks.updateOne).toHaveBeenCalledWith(expect.any(Object), { $set: expect.objectContaining({ status: "partially_complete", sourceProgress: expect.arrayContaining([expect.objectContaining({ source: "gitlab", status: "failed", error: expect.objectContaining({ code: "PROCESS_INTERRUPTED", retryable: true }) })]) }) });
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });
});
