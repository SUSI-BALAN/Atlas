import { describe, expect, it } from "vitest";
import { parseEnvironment } from "./env.js";

describe("environment configuration", () => {
  it("uses Render-compatible binding and explicit production origins", () => {
    const value = parseEnvironment({ NODE_ENV: "production", PORT: "10000", FRONTEND_ORIGINS: "https://atlaslaber.netlify.app" });
    expect(value).toMatchObject({ BACKEND_HOST: "0.0.0.0", PORT: 10000, FRONTEND_ORIGINS: ["https://atlaslaber.netlify.app"] });
  });

  it("keeps both supported local Vite origins in development", () => {
    const value = parseEnvironment({ NODE_ENV: "development" });
    expect(value.FRONTEND_ORIGINS).toEqual(expect.arrayContaining(["http://localhost:5175", "http://127.0.0.1:5175"]));
  });

  it("defaults to disabled AI with bounded generation settings", () => {
    const value = parseEnvironment({ NODE_ENV: "test" });
    expect(value).toMatchObject({
      AI_PROVIDER: "none",
      AI_REQUEST_TIMEOUT_MS: 60_000,
      AI_CONTEXT_MAX_CHARACTERS: 24_000,
      AI_MAX_OUTPUT_TOKENS: 1_200,
      AI_OUTPUT_MAX_CHARACTERS: 8_000
    });
  });

  it("rejects unsafe AI timeout and context limits", () => {
    expect(() => parseEnvironment({ AI_REQUEST_TIMEOUT_MS: "120001" })).toThrow();
    expect(() => parseEnvironment({ AI_CONTEXT_MAX_CHARACTERS: "100001" })).toThrow();
    expect(() => parseEnvironment({ AI_OUTPUT_MAX_CHARACTERS: "20001" })).toThrow();
  });

  it("accepts only bounded server-controlled AI output token limits", () => {
    expect(parseEnvironment({ AI_MAX_OUTPUT_TOKENS: "128" }).AI_MAX_OUTPUT_TOKENS).toBe(128);
    expect(parseEnvironment({ AI_MAX_OUTPUT_TOKENS: "4096" }).AI_MAX_OUTPUT_TOKENS).toBe(4096);
    for (const value of ["127", "4097", "1.5", "invalid"]) {
      expect(() => parseEnvironment({ AI_MAX_OUTPUT_TOKENS: value })).toThrow();
    }
  });
});
