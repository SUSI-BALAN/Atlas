import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { createSearchJobsRouter } from "./searchJobs.routes.js";
import express from "express";
import { createErrorHandler, AppError } from "../middleware/errorHandler.js";
import { allowTestAuth, testCookie } from "../tests/authFixture.js";
beforeEach(allowTestAuth); afterEach(() => vi.restoreAllMocks());

describe("search job routes", () => {
  it("validates the unified job request", async () => {
    const response = await request(createApp()).post("/api/search/jobs").set("Cookie", testCookie).set("X-CSRF-Token", "test").send({ query: "", sources: "all", collectionMode: "all" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires durable storage for all-results mode", async () => {
    const response = await request(createApp()).post("/api/search/jobs").set("Cookie", testCookie).set("X-CSRF-Token", "test").send({
      query: "AI agent", sources: "all", filters: {}, sort: { field: "relevance", direction: "desc" }, collectionMode: "all", resultLimit: null
    });
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("DATABASE_REQUIRED");
  });

  it("rejects malformed result cursors", async () => {
    const response = await request(createApp()).get("/api/search/jobs/not-an-id/results?cursor=bad").set("Cookie", testCookie);
    expect(response.status).toBe(400);
  });

  it("rate limits repeated search job creation attempts", async () => {
    const app = createApp();
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await request(app).post("/api/search/jobs").set("Cookie", testCookie).set("X-CSRF-Token", "test").send({ query: "" });
      expect(response.status).toBe(400);
    }
    const response = await request(app).post("/api/search/jobs").set("Cookie", testCookie).set("X-CSRF-Token", "test").send({ query: "" });
    expect(response.status).toBe(429);
    expect(response.body).toEqual(expect.objectContaining({
      success: false,
      error: expect.objectContaining({ code: "RATE_LIMITED" }),
      meta: { requestId: expect.any(String) }
    }));
  });

  it("bounds search history pagination", async () => {
    const list = async () => ({ jobs: [], nextCursor: null, hasMore: false });
    const app = express();
    app.use("/api/search/jobs", createSearchJobsRouter({ list } as never));
    app.use(createErrorHandler("test"));
    expect((await request(app).get("/api/search/jobs?limit=51")).status).toBe(400);
    expect((await request(app).get("/api/search/jobs?limit=50")).status).toBe(200);
  });

  it("keeps repository detail lookups scoped to the requested job", async () => {
    const repository = async () => { throw new AppError(404, "REPOSITORY_RESULT_NOT_FOUND", "Repository result was not found for this search job"); };
    const app = express();
    app.use("/api/search/jobs", createSearchJobsRouter({ repository } as never));
    app.use(createErrorHandler("test"));
    const response = await request(app).get("/api/search/jobs/507f1f77bcf86cd799439011/repositories/507f191e810c19729de860ea");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("REPOSITORY_RESULT_NOT_FOUND");
  });
});
