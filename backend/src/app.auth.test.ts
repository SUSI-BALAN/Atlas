import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";
import { authService } from "./services/auth/auth.service.js";
import { testCookie, testIdentity } from "./tests/authFixture.js";

const csrf = "test-csrf";
const protectedWrites = ["/api/search", "/api/search/jobs", "/api/saved", "/api/collections", "/api/watchlists", "/api/ai/sessions", `/api/ai/sessions/507f191e810c19729de860aa/messages`];
const protectedReads = ["/api/connectors", "/api/search/jobs", "/api/saved", "/api/collections", "/api/watchlists", "/api/changes", "/api/analytics/summary", "/api/ai/status"];

describe("Stage 6 route protection", () => {
  beforeEach(() => {
    vi.spyOn(authService, "resolve").mockResolvedValue(testIdentity);
    vi.spyOn(authService, "verifyCsrf").mockReturnValue(true);
  });
  afterEach(() => vi.restoreAllMocks());

  it.each(protectedWrites)("rejects unauthenticated write %s", async path => {
    const response = await request(createApp()).post(path).send({});
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: { code: "UNAUTHENTICATED" }, meta: { requestId: expect.any(String) } });
  });

  it.each(protectedReads)("rejects unauthenticated read %s", async path => {
    expect((await request(createApp()).get(path)).status).toBe(401);
  });

  it("keeps only health, readiness and version public", async () => {
    const app = createApp();
    expect((await request(app).get("/api/health")).status).toBe(200);
    expect([200, 503]).toContain((await request(app).get("/api/health/ready")).status);
    expect((await request(app).get("/api/version")).status).toBe(200);
  });

  it("preserves Helmet and request-ID headers on public responses", async () => {
    const response = await request(createApp()).get("/api/version");
    expect(response.headers["x-request-id"]).toEqual(expect.any(String));
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["content-security-policy"]).toContain("object-src 'none'");
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("returns a safe identity and session-bound CSRF token without exposing secrets", async () => {
    const app = createApp();
    const me = await request(app).get("/api/auth/me").set("Cookie", testCookie);
    expect(me.body.data).toEqual({ email: testIdentity.email, workspace: { key: "default", name: "Test workspace", role: "owner" }, expiresAt: testIdentity.expiresAt });
    expect(JSON.stringify(me.body)).not.toContain("csrfTokenHash");
    const response = await request(app).get("/api/auth/csrf").set("Cookie", testCookie);
    expect(response.body.data.token).toMatch(/^[A-Za-z\d_-]{43}$/);
  });

  it("clears a stale cookie when session resolution rejects it", async () => {
    vi.spyOn(authService, "resolve").mockResolvedValue(null);
    const response = await request(createApp()).get("/api/auth/me").set("Cookie", testCookie);
    expect(response.status).toBe(401);
    expect(response.headers["set-cookie"][0]).toContain("Max-Age=0");
  });

  it("requires CSRF for mutations but not safe GET", async () => {
    vi.spyOn(authService, "verifyCsrf").mockReturnValue(false);
    const app = createApp();
    expect((await request(app).get("/api/connectors").set("Cookie", testCookie)).status).toBe(200);
    expect((await request(app).post("/api/saved").set("Cookie", testCookie).send({})).body.error.code).toBe("INVALID_CSRF");
    expect((await request(app).post("/api/saved").set("Cookie", testCookie).set("X-CSRF-Token", "wrong").send({})).body.error.code).toBe("INVALID_CSRF");
    vi.spyOn(authService, "verifyCsrf").mockReturnValue(true);
    expect((await request(app).post("/api/saved").set("Cookie", testCookie).set("X-CSRF-Token", csrf).send({})).status).toBe(400);
  });

  it("rejects a cross-origin mutation even with a CSRF token", async () => {
    const response = await request(createApp()).post("/api/saved").set("Cookie", testCookie).set("Origin", "https://evil.example").set("X-CSRF-Token", csrf).send({});
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("INVALID_ORIGIN");
  });

  it("sets a fresh cookie on success without returning the token", async () => {
    const token = "A".repeat(43);
    vi.spyOn(authService, "login").mockResolvedValue({ token, csrfToken: "B".repeat(43), identity: testIdentity });
    const response = await request(createApp()).post("/api/auth/login").send({ email: "owner@example.test", password: "correct horse battery staple" });
    expect(response.status).toBe(200);
    expect(response.headers["set-cookie"][0]).toContain("HttpOnly");
    expect(JSON.stringify(response.body)).not.toContain(token);
  });

  it("rejects a cross-origin login before credential lookup", async () => {
    const login = vi.spyOn(authService, "login");
    const response = await request(createApp()).post("/api/auth/login").set("Origin", "https://evil.example").send({ email: "owner@example.test", password: "correct horse battery staple" });
    expect(response.status).toBe(403);
    expect(login).not.toHaveBeenCalled();
  });

  it("uses generic login errors and rate-limits repeated attempts", async () => {
    vi.spyOn(authService, "login").mockResolvedValue(null);
    const app = createApp();
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await request(app).post("/api/auth/login").send({ email: "missing@example.test", password: "wrong password" });
      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe("Invalid email or password");
    }
    const limited = await request(app).post("/api/auth/login").send({ email: "missing@example.test", password: "wrong password" });
    expect(limited.status).toBe(429);
    expect(limited.body.meta.requestId).toEqual(expect.any(String));
  });

  it("logs out idempotently and clears the cookie", async () => {
    const app = createApp();
    const revoke = vi.spyOn(authService, "revoke").mockResolvedValue();
    const active = await request(app).post("/api/auth/logout").set("Cookie", testCookie).set("X-CSRF-Token", csrf);
    expect(active.status).toBe(200);
    expect(revoke).toHaveBeenCalled();
    const repeat = await request(app).post("/api/auth/logout");
    expect(repeat.status).toBe(200);
    expect(repeat.headers["set-cookie"][0]).toContain("Max-Age=0");
  });
});
