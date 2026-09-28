import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SearchJob } from "../types/api";
import { JobProgress, SearchPage } from "./SearchPage";

const baseJob: SearchJob = {
  jobId: "job",
  status: "partially_complete",
  request: { query: "atlas", sources: ["github"], filters: {}, sort: { field: "relevance", direction: "desc" }, collectionMode: "preview", resultLimit: 50 },
  sourceProgress: [],
  totalUnique: 0,
  cancelRequested: false,
  cached: false,
  createdAt: "2026-09-28T00:00:00.000Z",
  startedAt: "2026-09-28T00:00:00.000Z",
  completedAt: "2026-09-28T00:00:01.000Z"
};

describe("SearchPage", () => {
  it("renders provider-neutral search controls", () => {
    render(<QueryClientProvider client={new QueryClient()}><SearchPage /></QueryClientProvider>);
    expect(screen.getByRole("heading", { name: /collect all available results/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /research query/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start research/i })).toBeInTheDocument();
  });

  it("offers retry only when the backend marks a failed source as retryable", () => {
    const progress = { source: "github" as const, status: "failed" as const, fetched: 0, pages: 0, total: null, rateLimit: null };
    const { rerender } = render(<JobProgress job={{ ...baseJob, sourceProgress: [{ ...progress, error: { code: "AUTHORIZATION", message: "Denied", retryable: false } }] }} onCancel={vi.fn()} onRetry={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Retry source" })).not.toBeInTheDocument();

    rerender(<JobProgress job={{ ...baseJob, sourceProgress: [{ ...progress, error: { code: "NETWORK", message: "Temporary", retryable: true } }] }} onCancel={vi.fn()} onRetry={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Retry source" })).toBeInTheDocument();
  });
});
