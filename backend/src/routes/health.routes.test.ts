import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";

describe("GET /api/health", () => {
  it("exposes non-secret release identity fields", async () => {
    const response = await request(createApp()).get("/api/version");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ version: "0.1.0", buildId: null, commit: null });
    expect(response.body.meta.requestId).toBeTruthy();
  });

  it("returns dependency-aware health data", async () => {
    const response = await request(createApp()).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({ status: "degraded", database: "disconnected" });
    expect(response.headers["x-request-id"]).toBeTruthy();
  });

  it("returns a failing readiness response when MongoDB is unavailable", async () => {
    const response = await request(createApp()).get("/api/health/ready");
    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ success: false, error: { code: "DATABASE_UNAVAILABLE" }, data: { databaseReady: false } });
  });

  it("allows the configured local frontend and omits CORS for unknown origins", async () => {
    const allowed = await request(createApp()).get("/api/health").set("Origin", "http://localhost:5175");
    const rejected = await request(createApp()).get("/api/health").set("Origin", "https://example.invalid");
    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:5175");
    expect(rejected.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
