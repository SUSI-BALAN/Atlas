import { describe, expect, it } from "vitest";
import { parseEnvironment } from "./env.js";

describe("environment", () => {
  it("supports the documented names and derives provider API URLs", () => {
    const value = parseEnvironment({ BACKEND_PORT: "4100", FRONTEND_ORIGIN: "http://localhost:5174", CONNECTOR_CONCURRENCY: "2", GITLAB_BASE_URL: "https://gitlab.example", GITLAB_ENABLED: "true" });
    expect(value).toMatchObject({ PORT: 4100, FRONTEND_URL: "http://localhost:5174", SEARCH_CONCURRENCY: 2, GITLAB_ENABLED: true, GITLAB_API_BASE_URL: "https://gitlab.example/api/v4/" });
  });
  it("rejects invalid boolean flags", () => { expect(() => parseEnvironment({ GITHUB_ENABLED: "yes" })).toThrow(/Invalid environment configuration/); });
});
