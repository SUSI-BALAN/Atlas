import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { connectorRegistry } from "../composition.js";
import { logger } from "../config/logger.js";
import { allowTestAuth, testCookie } from "../tests/authFixture.js";

afterEach(() => vi.restoreAllMocks());
beforeEach(allowTestAuth);

describe("GET /api/connectors", () => {
  it("reports enabled anonymous connectors as unchecked until a provider request succeeds", async () => {
    const response = await request(createApp()).get("/api/connectors").set("Cookie", testCookie);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "github", enabled: true, authentication: "anonymous", health: expect.objectContaining({ status: "unavailable", lastCheckedAt: null }) }),
      expect.objectContaining({ id: "gitlab", enabled: true, authentication: "anonymous", homepageUrl: "https://gitlab.com/", health: expect.objectContaining({ status: "unavailable", lastCheckedAt: null }) }),
      expect.objectContaining({ id: "codeberg", enabled: true, authentication: "anonymous", homepageUrl: "https://codeberg.org/explore/repos", health: expect.objectContaining({ status: "unavailable", lastCheckedAt: null }) }),
      expect.objectContaining({ id: "gitea", enabled: true, authentication: "anonymous", homepageUrl: "https://gitea.com/explore/repos", health: expect.objectContaining({ status: "unavailable", lastCheckedAt: null }) }),
      expect.objectContaining({ id: "forgejo", enabled: true, authentication: "anonymous", homepageUrl: "https://v15.next.forgejo.org/explore/repos", health: expect.objectContaining({ status: "unavailable", lastCheckedAt: null }) })
    ]));
    expect(response.body.data.map((connector: { id: string }) => connector.id)).toEqual(["github", "gitlab", "codeberg", "gitea", "forgejo"]);
  });

  it("classifies a connector status failure without exposing its reason", async () => {
    const connector = connectorRegistry.get("github");
    if (!connector) throw new Error("GitHub connector was not registered");
    vi.spyOn(connector, "getHealth").mockImplementationOnce(() => { throw new Error("health probe failed"); });
    const log = vi.spyOn(logger, "error").mockImplementation(() => logger);

    const response = await request(createApp()).get("/api/connectors").set("Cookie", testCookie);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(5);
    expect(response.body.data[0]).toEqual(expect.objectContaining({ id: "github", health: expect.objectContaining({ status: "unavailable", message: "GitHub status is unavailable" }) }));
    expect(JSON.stringify(response.body)).not.toContain("health probe failed");
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ connectorId: "github", connectorName: "GitHub", error: { category: "unknown", name: "Error", code: null } }), "Connector status read failed");
  });
});
