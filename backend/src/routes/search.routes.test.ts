import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { allowTestAuth, testCookie } from "../tests/authFixture.js";
beforeEach(allowTestAuth); afterEach(() => vi.restoreAllMocks());

describe("POST /api/search", () => {
  it("rejects empty queries before invoking a connector", async () => {
    const response = await request(createApp()).post("/api/search").set("Cookie", testCookie).set("X-CSRF-Token", "test").send({ query: "", sources: ["github"] });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns a source-level failure for an unknown connector", async () => {
    const response = await request(createApp()).post("/api/search").set("Cookie", testCookie).set("X-CSRF-Token", "test").send({ query: "test", sources: ["unknown"] });
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("failed");
    expect(response.body.data.sourceStatus[0]).toMatchObject({ source: "unknown", status: "failed" });
  });
});
