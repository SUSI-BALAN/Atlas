import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";

describe("POST /api/search", () => {
  it("rejects empty queries before invoking a connector", async () => {
    const response = await request(createApp()).post("/api/search").send({ query: "", sources: ["github"] });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns a source-level failure for an unknown connector", async () => {
    const response = await request(createApp()).post("/api/search").send({ query: "test", sources: ["unknown"] });
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("failed");
    expect(response.body.data.sourceStatus[0]).toMatchObject({ source: "unknown", status: "failed" });
  });
});
