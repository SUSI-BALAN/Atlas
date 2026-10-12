import { describe, expect, it } from "vitest";
import { releaseIdentity } from "./version.routes.js";

describe("releaseIdentity", () => {
  it("uses the Render commit as the primary deployment identity", () => {
    expect(releaseIdentity({ RENDER_GIT_COMMIT: "abcdef1234567890", BUILD_ID: "release-42" }))
      .toEqual({ version: "0.1.0", commit: "abcdef1234567890", buildId: "release-42" });
  });

  it("allows the supplemental build label to be absent", () => {
    expect(releaseIdentity({ RENDER_GIT_COMMIT: "abcdef1234567890" }))
      .toEqual({ version: "0.1.0", commit: "abcdef1234567890", buildId: null });
  });

  it("reports missing local identity values without inventing them", () => {
    expect(releaseIdentity({}))
      .toEqual({ version: "0.1.0", commit: null, buildId: null });
  });
});
