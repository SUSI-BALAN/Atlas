import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "./DashboardPage";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter><DashboardPage /></MemoryRouter></QueryClientProvider>);
}

describe("DashboardPage", () => {
  it("shows a disconnected API instead of checking forever after requests fail", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    renderDashboard();

    expect(await screen.findByText("Disconnected")).toBeInTheDocument();
    expect(screen.getByText("Database: Unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Checking")).not.toBeInTheDocument();
  });

  it("reports database degradation without marking the API disconnected", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const data = url.endsWith("/api/health") ? { status: "degraded", database: "disconnected" } : [];
      return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { "content-type": "application/json" } });
    }));
    renderDashboard();

    expect(await screen.findByText("degraded")).toBeInTheDocument();
    expect(screen.getByText("Database: disconnected")).toBeInTheDocument();
    expect(screen.queryByText("Disconnected")).not.toBeInTheDocument();
  });
});
