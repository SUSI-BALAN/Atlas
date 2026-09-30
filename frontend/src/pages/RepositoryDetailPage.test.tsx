import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ getRepositoryResult: vi.fn() }));
vi.mock("../services/api", () => api);
import { RepositoryDetailPage } from "./RepositoryDetailPage";

describe("RepositoryDetailPage", () => {
  it("preserves the job and result cursor in its return link", async () => {
    api.getRepositoryResult.mockResolvedValue({ id: "github:1", repositoryId: "507f191e810c19729de860ea", source: "github", externalId: "1", owner: "atlas", name: "core", fullName: "atlas/core", description: null, repositoryUrl: "https://example.test/atlas/core", cloneUrl: null, defaultBranch: null, language: null, languages: [], topics: [], stars: 1, forks: 0, watchers: null, openIssues: null, license: null, createdAt: null, updatedAt: null, pushedAt: null, archived: false, fork: false, visibility: "public", sourceMetadata: {} });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/search/jobs/507f1f77bcf86cd799439011/repositories/507f191e810c19729de860ea?cursor=507f191e810c19729de860eb"]}><Routes><Route path="/search/jobs/:jobId/repositories/:repositoryId" element={<RepositoryDetailPage />} /></Routes></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByRole("heading", { name: "atlas/core" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to results" })).toHaveAttribute("href", "/search?job=507f1f77bcf86cd799439011&cursor=507f191e810c19729de860eb");
    expect(screen.getByRole("link", { name: "Open original source" })).toHaveAttribute("rel", "noopener noreferrer");
  });
});
