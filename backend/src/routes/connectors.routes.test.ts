import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { connectorRegistry } from "../composition.js";
import { logger } from "../config/logger.js";

afterEach(() => vi.restoreAllMocks());

describe("GET /api/connectors", () => {
  it("reports enabled anonymous connectors without treating authentication mode as a health limit", async () => {
    const response = await request(createApp()).get("/api/connectors");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "github", enabled: true, authentication: "anonymous", health: expect.objectContaining({ status: "healthy" }) }),
      expect.objectContaining({ id: "gitlab", enabled: true, authentication: "anonymous", homepageUrl: "https://gitlab.com/", health: expect.objectContaining({ status: "healthy" }) }),
      expect.objectContaining({ id: "codeberg", enabled: true, authentication: "anonymous", homepageUrl: "https://codeberg.org/explore/repos", health: expect.objectContaining({ status: "healthy" }) }),
      expect.objectContaining({ id: "gitea", enabled: true, authentication: "anonymous", homepageUrl: "https://gitea.com/explore/repos", health: expect.objectContaining({ status: "healthy" }) }),
      expect.objectContaining({ id: "forgejo", enabled: true, authentication: "anonymous", homepageUrl: "https://v15.next.forgejo.org/explore/repos", health: expect.objectContaining({ status: "healthy" }) })
    ]));
    expect(response.body.data.map((connector: { id: string }) => connector.id)).toEqual(["github", "gitlab", "codeberg", "gitea", "forgejo"]);
  });

  it("logs a connector-specific reason and preserves the rest of the list when status access fails", async () => {
    const connector = connectorRegistry.get("github");
    if (!connector) throw new Error("GitHub connector was not registered");
    vi.spyOn(connector, "getHealth").mockImplementationOnce(() => { throw new Error("health probe failed"); });
    const log = vi.spyOn(logger, "error").mockImplementation(() => logger);

    const response = await request(createApp()).get("/api/connectors");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(5);
    expect(response.body.data[0]).toEqual(expect.objectContaining({ id: "github", health: expect.objectContaining({ status: "unavailable", message: expect.stringContaining("health probe failed") }) }));
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ connectorId: "github", connectorName: "GitHub", reason: "health probe failed" }), "Connector status read failed");
  });
});
