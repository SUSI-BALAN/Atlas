import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ bootstrapGuestSession: vi.fn() }));
vi.mock("../services/api", () => api);
import { AuthGate } from "./AuthGate";

function renderGate() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter><AuthGate><span>Public Atlas content</span></AuthGate></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => vi.clearAllMocks()); afterEach(cleanup);
describe("automatic private-session gate", () => {
  it("does not flash application content while a guest session is being created", () => {
    api.bootstrapGuestSession.mockReturnValue(new Promise(() => {}));
    renderGate();
    expect(screen.getByRole("status")).toHaveTextContent("Preparing your private workspace");
    expect(screen.queryByText("Public Atlas content")).not.toBeInTheDocument();
  });
  it("shows the public application without login after automatic guest creation", async () => {
    api.bootstrapGuestSession.mockResolvedValue({ kind: "guest", email: null, workspace: { name: "Private guest workspace", role: "guest" }, expiresAt: "2030-01-01T00:00:00Z" });
    renderGate();
    expect(await screen.findByText("Public Atlas content")).toBeInTheDocument();
  });
  it("fails closed without displaying workspace data when persistence is unavailable", async () => {
    api.bootstrapGuestSession.mockRejectedValue(new Error("API unavailable (503)"));
    renderGate();
    expect(await screen.findByRole("alert")).toHaveTextContent("No shared fallback workspace was used");
    expect(screen.queryByText("Public Atlas content")).not.toBeInTheDocument();
  });
});
