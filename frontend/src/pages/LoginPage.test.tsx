import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ authLogin: vi.fn() }));
vi.mock("../services/api", () => api);
import { LoginPage, safeReturnPath } from "./LoginPage";

function renderPage(from: string | undefined = "/saved") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[{ pathname: "/login", state: { from } }]}><Routes>
    <Route path="/login" element={<LoginPage />} /><Route path="/saved" element={<span>Saved research</span>} /><Route path="/" element={<span>Home</span>} />
  </Routes></MemoryRouter></QueryClientProvider>);
  return client;
}
beforeEach(() => vi.clearAllMocks()); afterEach(cleanup);
describe("login page", () => {
  it("renders accessible owner-controlled login fields", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Sign in to Atlas" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
  });
  it("shows pending state and restores the intended route after login", async () => {
    let complete!: (value: unknown) => void;
    api.authLogin.mockReturnValue(new Promise(resolve => { complete = resolve; }));
    const client = renderPage();
    client.setQueryData(["saved", "former-workspace"], { note: "old workspace data" });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "owner@example.test");
    await user.type(screen.getByLabelText("Password"), "correct horse battery staple");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
    complete({ email: "owner@example.test", workspace: { key: "default", name: "Atlas", role: "owner" } });
    expect(await screen.findByText("Saved research")).toBeInTheDocument();
    expect(client.getQueryData(["auth", "me"])).toMatchObject({ email: "owner@example.test" });
    expect(client.getQueryData(["saved", "former-workspace"])).toBeUndefined();
  });
  it("shows a generic error without disclosing whether the account exists", async () => {
    api.authLogin.mockRejectedValue(new Error("raw database failure"));
    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "owner@example.test");
    await user.type(screen.getByLabelText("Password"), "wrong password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Invalid email or password"));
    expect(screen.getByRole("alert")).not.toHaveTextContent("database");
  });
  it("rejects external, protocol-relative and backslash redirect targets", () => {
    for (const path of ["https://evil.test", "//evil.test", "/\\evil.test", "/%2Fevil.test", "/%5cevil.test", "/login"]) expect(safeReturnPath(path)).toBe("/");
    expect(safeReturnPath("/saved?tag=core")).toBe("/saved?tag=core");
  });
});
