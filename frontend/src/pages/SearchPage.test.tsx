import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { SearchJob } from "../types/api";

const api = vi.hoisted(() => ({
  listConnectors: vi.fn(async () => []),
  listSearchJobs: vi.fn(async () => ({ jobs: [], nextCursor: null, hasMore: false })),
  getSearchJob: vi.fn(),
  getSearchJobResults: vi.fn(async () => ({ results: [], nextCursor: null, hasMore: false })),
  createSearchJob: vi.fn(), cancelSearchJob: vi.fn(), retrySearchSource: vi.fn(),
  searchExportUrl: vi.fn((jobId: string, format: string) => `/api/search/jobs/${jobId}/export?format=${format}`)
}));
vi.mock("../services/api", () => api);

import { JobProgress, SearchPage } from "./SearchPage";

const firstId = "507f1f77bcf86cd799439011";
const secondId = "507f1f77bcf86cd799439012";
const baseJob: SearchJob = {
  jobId: firstId, status: "partially_complete",
  request: { query: "atlas", sources: ["github"], filters: {}, sort: { field: "relevance", direction: "desc" }, collectionMode: "preview", resultLimit: 50 },
  sourceProgress: [], totalUnique: 0, cancelRequested: false, cached: false,
  createdAt: "2026-09-28T00:00:00.000Z", startedAt: "2026-09-28T00:00:00.000Z", completedAt: "2026-09-28T00:00:01.000Z"
};

function renderSearch(entry = "/search") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[entry]}><SearchPage /></MemoryRouter></QueryClientProvider>);
}

afterEach(() => { cleanup(); vi.clearAllMocks(); api.listConnectors.mockResolvedValue([]); api.listSearchJobs.mockResolvedValue({ jobs: [], nextCursor: null, hasMore: false }); });

describe("SearchPage", () => {
  it("renders provider-neutral search controls", () => {
    renderSearch();
    expect(screen.getByRole("heading", { name: /collect all available results/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /research query/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start research/i })).toBeInTheDocument();
  });

  it("restores a job from the URL", async () => {
    api.getSearchJob.mockResolvedValue(baseJob);
    renderSearch(`/search?job=${firstId}`);
    await waitFor(() => expect(api.getSearchJob).toHaveBeenCalledWith(firstId));
    expect(await screen.findByRole("heading", { name: "partially complete" })).toBeInTheDocument();
  });

  it("handles an invalid URL job id without making an API request", () => {
    renderSearch("/search?job=not-an-object-id");
    expect(screen.getByRole("alert")).toHaveTextContent("invalid job ID");
    expect(api.getSearchJob).not.toHaveBeenCalled();
  });

  it("navigates between persisted jobs from history", async () => {
    api.listSearchJobs.mockResolvedValue({ jobs: [
      { jobId: firstId, query: "first query", requestedSources: ["github"], collectionMode: "preview", status: "completed", totalUnique: 1, createdAt: "2026-09-30T02:00:00Z", startedAt: null, completedAt: null, cached: false },
      { jobId: secondId, query: "second query", requestedSources: ["gitlab"], collectionMode: "expanded", status: "failed", totalUnique: 0, createdAt: "2026-09-30T01:00:00Z", startedAt: null, completedAt: null, cached: false }
    ], nextCursor: null, hasMore: false } as never);
    api.getSearchJob.mockImplementation(async (jobId: string) => ({ ...baseJob, jobId, request: { ...baseJob.request, query: jobId === firstId ? "first query" : "second query" } }));
    renderSearch(`/search?job=${firstId}`);
    await userEvent.click(await screen.findByRole("button", { name: /second query/i }));
    await waitFor(() => expect(api.getSearchJob).toHaveBeenLastCalledWith(secondId));
    await userEvent.click(screen.getByRole("button", { name: /first query/i }));
    await waitFor(() => expect(api.getSearchJob).toHaveBeenLastCalledWith(firstId));
  });

  it("distinguishes partial, provider-limited, and permanent failure states", () => {
    render(<JobProgress job={{ ...baseJob, sourceProgress: [{ source: "github", status: "failed", fetched: 4, pages: 1, total: null, rateLimit: null, providerLimited: true, error: { code: "AUTHORIZATION", message: "Denied", retryable: false } }] }} onCancel={vi.fn()} onRetry={vi.fn()} />);
    expect(screen.getByText(/Provider search window reached/i)).toBeInTheDocument();
    expect(screen.getByText(/This failure is permanent/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry source" })).not.toBeInTheDocument();
  });

  it("offers retry only when the backend marks a failed source as retryable", () => {
    const progress = { source: "github" as const, status: "failed" as const, fetched: 0, pages: 0, total: null, rateLimit: null };
    const { rerender } = render(<JobProgress job={{ ...baseJob, sourceProgress: [{ ...progress, error: { code: "AUTHORIZATION", message: "Denied", retryable: false } }] }} onCancel={vi.fn()} onRetry={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Retry source" })).not.toBeInTheDocument();
    rerender(<JobProgress job={{ ...baseJob, sourceProgress: [{ ...progress, error: { code: "NETWORK", message: "Temporary", retryable: true } }] }} onCancel={vi.fn()} onRetry={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Retry source" })).toBeInTheDocument();
  });
});
