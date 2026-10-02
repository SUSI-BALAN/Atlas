import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ authMe: vi.fn() }));
vi.mock("../services/api", () => api);
import { AuthGate } from "./AuthGate";

const destination = () => <span>Protected content</span>;
function LoginLocation() { const location = useLocation(); return <span>Login destination: {String(location.state?.from)}</span>; }
function renderGate(path = "/analytics") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/login" element={<LoginLocation />} />
    <Route path="*" element={<AuthGate>{destination()}</AuthGate>} />
  </Routes></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => vi.clearAllMocks()); afterEach(cleanup);
describe("authenticated route gate", () => {
  it("does not flash protected content while authentication is loading", () => {
    api.authMe.mockReturnValue(new Promise(() => {}));
    renderGate();
    expect(screen.getByRole("status")).toHaveTextContent("Checking your session");
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });
  it("redirects unauthenticated visitors and remembers the intended route", async () => {
    api.authMe.mockRejectedValue(new Error("Authentication required"));
    renderGate("/watchlists?status=enabled");
    expect(await screen.findByText("Login destination: /watchlists?status=enabled")).toBeInTheDocument();
  });
  it("renders protected content only after a successful me response", async () => {
    api.authMe.mockResolvedValue({ email: "owner@example.test", workspace: { key: "default", name: "Atlas", role: "owner" } });
    renderGate();
    expect(await screen.findByText("Protected content")).toBeInTheDocument();
  });
  it("shows a retryable availability error without exposing data", async () => {
    api.authMe.mockRejectedValue(new Error("API unavailable (503)"));
    renderGate();
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to check your session");
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });
});
