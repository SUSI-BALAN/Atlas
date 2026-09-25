import { describe, expect, it } from "vitest";
import { canonicalizeRepositoryUrl } from "./searchJob.service.js";

describe("repository URL identity", () => {
  it("normalizes exact repository URL variants without confusing fork paths", () => {
    expect(canonicalizeRepositoryUrl("HTTPS://GitHub.com/Owner/Repo.git/?tab=readme#top")).toBe("https://github.com/owner/repo");
    expect(canonicalizeRepositoryUrl("https://github.com/other/repo")).not.toBe(canonicalizeRepositoryUrl("https://github.com/owner/repo"));
  });
});
