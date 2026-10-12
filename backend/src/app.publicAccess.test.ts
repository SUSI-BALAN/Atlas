import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";
import { authService, type AuthIdentity } from "./services/auth/auth.service.js";
import { OperationQuotaModel } from "./models/quota.model.js";
import { SearchJobModel } from "./models/searchJob.model.js";

const guest: AuthIdentity = { kind: "guest", userId: null, email: null, workspaceKey: "guest_a", workspaceName: "Private guest workspace", role: "guest", expiresAt: "2030-01-01T00:00:00.000Z", sessionId: "507f191e810c19729de860a2", csrfTokenHash: "00".repeat(32) };
const cookie = "atlas_session=" + "A".repeat(43);

describe("public guest protection", () => {
  beforeEach(() => {
    vi.spyOn(authService, "resolve").mockResolvedValue(guest);
    vi.spyOn(authService, "verifyCsrf").mockReturnValue(true);
    vi.spyOn(OperationQuotaModel, "findOneAndUpdate").mockReturnValue({ lean: async () => ({ count: 1 }) } as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("rejects a third simultaneous search before provider work begins", async () => {
    vi.spyOn(SearchJobModel, "countDocuments").mockResolvedValue(2);
    const response = await request(createApp()).post("/api/search/jobs").set("Cookie", cookie).set("X-CSRF-Token", "csrf").send({});
    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe("SEARCH_CONCURRENCY_EXCEEDED");
  });

  it("fails closed when the persistent write quota cannot be checked", async () => {
    vi.spyOn(OperationQuotaModel, "findOneAndUpdate").mockImplementation(() => { throw new Error("quota database unavailable"); });
    const response = await request(createApp({ nodeEnv: "production" })).post("/api/collections").set("Cookie", cookie).set("X-CSRF-Token", "csrf").send({ name: "Private", description: "" });
    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain("quota database unavailable");
  });
});
