import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { NormalizedRepository } from "../types/repositorySearch.js";
import { createSearchJobsRouter } from "./searchJobs.routes.js";
import { AppError, createErrorHandler } from "../middleware/errorHandler.js";

function repository(id: string, description: string): NormalizedRepository {
  return {
    id: `github:${id}`, source: "github", externalId: id, owner: "atlas", name: `repo-${id}`, fullName: `atlas/repo-${id}`,
    description, repositoryUrl: `https://example.test/atlas/repo-${id}`, cloneUrl: null, defaultBranch: "main", language: "TypeScript",
    languages: ["TypeScript"], topics: [], stars: Number(id), forks: 0, watchers: null, openIssues: null, license: null,
    createdAt: null, updatedAt: "2026-09-28T00:00:00.000Z", pushedAt: null, archived: false, fork: false, visibility: "public", sourceMetadata: {}
  };
}

describe("search result exports", () => {
  it("streams every cursor page with JSON and CSV row parity", async () => {
    const rows = [repository("1", "quoted, value"), repository("2", "a \"quote\"")];
    const results = vi.fn(async (_jobId: string, cursor: string | undefined) => cursor
      ? { results: [rows[1]!], nextCursor: "cursor-2", hasMore: false }
      : { results: [rows[0]!], nextCursor: "cursor-1", hasMore: true });
    const service = {
      create: vi.fn(), get: vi.fn(async () => ({})), results,
      cancel: vi.fn(), retrySource: vi.fn()
    };
    const app = express();
    app.use("/api/search/jobs", createSearchJobsRouter(service as never));

    const json = await request(app).get("/api/search/jobs/job/export?format=json");
    const csv = await request(app).get("/api/search/jobs/job/export?format=csv");

    expect(json.status).toBe(200);
    expect(json.body.map((row: NormalizedRepository) => row.externalId)).toEqual(["1", "2"]);
    expect(csv.status).toBe(200);
    const csvLines = csv.text.trimEnd().split("\n");
    expect(csvLines).toHaveLength(json.body.length + 1);
    expect(csvLines[1]).toContain('"quoted, value"');
    expect(csvLines[2]).toContain('"a ""quote"""');
    expect(results).toHaveBeenCalledTimes(4);
  });

  it("never exports a foreign job when ownership lookup returns not found", async () => {
    const results = vi.fn();
    const app = express();
    app.use("/api/search/jobs", createSearchJobsRouter({ get: async () => { throw new AppError(404, "SEARCH_JOB_NOT_FOUND", "Search job was not found"); }, results } as never));
    app.use(createErrorHandler("test"));
    const response = await request(app).get("/api/search/jobs/507f191e810c19729de860aa/export?format=csv");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("SEARCH_JOB_NOT_FOUND");
    expect(results).not.toHaveBeenCalled();
  });
});
