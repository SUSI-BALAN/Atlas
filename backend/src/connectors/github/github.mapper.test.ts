import { describe, expect, it } from "vitest";
import { mapRepository } from "./github.mapper.js";
import type { GitHubRepository } from "./github.types.js";

describe("GitHub repository normalization", () => {
  it("preserves provider values and provenance without inventing missing data", () => {
    const repository: GitHubRepository = {
      id: 1, node_id: "R_1", name: "project", full_name: "owner/project", description: null,
      html_url: "https://github.com/owner/project",
      owner: { id: 2, node_id: "U_2", login: "owner", avatar_url: "https://example.test/avatar", html_url: "https://github.com/owner", type: "User" },
      language: "TypeScript", stargazers_count: 10, forks_count: 2, watchers_count: 4, open_issues_count: 1,
      default_branch: "main", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-02-01T00:00:00Z",
      pushed_at: null, archived: false, fork: false, homepage: null, size: 128
    };
    const item = mapRepository(repository, { requestId: "request-1", jobId: null });
    expect(item).toMatchObject({ source: "github", sourceId: "R_1", sourceType: "repository", description: null, language: "TypeScript" });
    expect(item.metrics).toMatchObject({ stars: 10, forks: 2, views: null });
    expect(item.provenance.requestId).toBe("request-1");
  });
});
