import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const config = readFileSync(fileURLToPath(new URL("../../../netlify.toml", import.meta.url)), "utf8");

describe("Netlify security configuration", () => {
  it("defines the required static response headers", () => {
    expect(config).toContain('for = "/*"');
    expect(config).toContain('Referrer-Policy = "no-referrer"');
    expect(config).toContain('X-Content-Type-Options = "nosniff"');
    expect(config).toContain('X-Frame-Options = "DENY"');
    expect(config).toContain('Permissions-Policy = "camera=(), microphone=(), geolocation=()"');
  });

  it("keeps immutable caching scoped to generated assets", () => {
    expect(config).toContain('for = "/assets/*"');
    expect(config).toContain('Cache-Control = "public, max-age=31536000, immutable"');
  });
});
