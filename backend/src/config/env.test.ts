import { describe, expect, it } from "vitest";
import { parseEnvironment } from "./env.js";

describe("environment configuration", () => {
  it("uses Render-compatible binding and explicit production origins", () => {
    const value = parseEnvironment({ NODE_ENV: "production", PORT: "10000", FRONTEND_ORIGINS: "https://atlashu.netlify.app" });
    expect(value).toMatchObject({ BACKEND_HOST: "0.0.0.0", PORT: 10000, FRONTEND_ORIGINS: ["https://atlashu.netlify.app"] });
  });

  it("keeps both supported local Vite origins in development", () => {
    const value = parseEnvironment({ NODE_ENV: "development" });
    expect(value.FRONTEND_ORIGINS).toEqual(expect.arrayContaining(["http://localhost:5175", "http://127.0.0.1:5175"]));
  });
});
