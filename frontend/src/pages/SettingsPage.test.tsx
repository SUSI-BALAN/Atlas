import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ bootstrapGuestSession: vi.fn() }));
vi.mock("../services/api", () => api);
import { SettingsPage } from "./SettingsPage";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("guest session information", () => {
  it("explains private browser-bound guest storage without account controls", async () => {
    api.bootstrapGuestSession.mockResolvedValue({ kind: "guest", email: null, workspace: { name: "Private guest workspace", role: "guest" }, expiresAt: "2030-01-01T00:00:00Z" });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter><SettingsPage /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByRole("heading", { name: "Private guest workspace" })).toBeInTheDocument();
    expect(screen.getByText(/does not transfer to another browser or device/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sign/i })).not.toBeInTheDocument();
  });
});
