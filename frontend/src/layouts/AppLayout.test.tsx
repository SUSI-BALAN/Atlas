import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppLayout } from "./AppLayout";

describe("AppLayout source status", () => {
  it("does not display a misleading zero-of-zero status when the API is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><AppLayout /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("Sources unavailable")).toBeInTheDocument();
    expect(screen.queryByText("0/0 sources available")).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
