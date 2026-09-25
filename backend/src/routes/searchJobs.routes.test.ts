import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";

describe("search job routes", () => {
  it("validates the unified job request", async () => {
    const response = await request(createApp()).post("/api/search/jobs").send({ query: "", sources: "all", collectionMode: "all" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires durable storage for all-results mode", async () => {
    const response = await request(createApp()).post("/api/search/jobs").send({
      query: "AI agent", sources: "all", filters: {}, sort: { field: "relevance", direction: "desc" }, collectionMode: "all", resultLimit: null
    });
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("DATABASE_REQUIRED");
  });

  it("rejects malformed result cursors", async () => {
    const response = await request(createApp()).get("/api/search/jobs/not-an-id/results?cursor=bad");
    expect(response.status).toBe(400);
  });
});
