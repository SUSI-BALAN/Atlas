import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SourcesPage } from "./SourcesPage";

afterEach(() => vi.unstubAllGlobals());

describe("SourcesPage", () => {
  it("does not present anonymous provider quotas as a limited connector or rate-limit row", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      success: true,
      data: [{
        id: "github", name: "GitHub", version: "0.1.0", homepageUrl: "https://github.com/explore",
        accessMethod: "Official GitHub REST API", enabled: true, authentication: "anonymous",
        capabilities: { repositories: true },
        health: { status: "limited", message: null, lastSuccessfulRequestAt: null },
        rateLimit: { limit: 10, remaining: 9, resetAt: null, retryAfterSeconds: null }
      }]
    }), { status: 200, headers: { "content-type": "application/json" } })));

    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SourcesPage /></QueryClientProvider>);

    expect(await screen.findByRole("heading", { name: "GitHub" })).toBeInTheDocument();
    expect(screen.queryByText(/^limited$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^rate limit$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^reset$/i)).not.toBeInTheDocument();
  });
});
