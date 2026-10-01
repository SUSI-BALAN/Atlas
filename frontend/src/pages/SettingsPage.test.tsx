import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ authMe: vi.fn(), authLogout: vi.fn() }));
vi.mock("../services/api", () => api);
import { SettingsPage } from "./SettingsPage";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("security settings", () => {
  it("shows only safe identity and signs out", async () => {
    api.authMe.mockResolvedValue({ email: "owner@example.test", workspace: { key: "default", name: "Atlas", role: "owner" }, expiresAt: "2030-01-01T00:00:00Z" });
    api.authLogout.mockResolvedValue(undefined);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/settings"]}><Routes><Route path="/settings" element={<SettingsPage />} /><Route path="/login" element={<span>Login route</span>} /></Routes></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("owner@example.test")).toBeInTheDocument();
    expect(screen.getByText("Workspace: Atlas (owner)")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByText("Login route")).toBeInTheDocument();
    expect(api.authLogout).toHaveBeenCalledOnce();
  });
});
