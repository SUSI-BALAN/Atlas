import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  lookupSaved: vi.fn(),
  saveRepository: vi.fn(async () => undefined),
  unsaveRepository: vi.fn(async () => undefined)
}));
vi.mock("../services/api", () => api);

import { SaveRepositoryButton } from "./SaveRepositoryButton";

function renderButton() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><SaveRepositoryButton jobId="507f1f77bcf86cd799439011" repositoryId="507f191e810c19729de860ea" source="github" externalId="42" /></QueryClientProvider>);
}

describe("SaveRepositoryButton", () => {
  it("saves an unsaved search repository by its persisted reference", async () => {
    api.lookupSaved.mockResolvedValue(null);
    renderButton();
    await userEvent.click(await screen.findByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.saveRepository).toHaveBeenCalledWith("507f1f77bcf86cd799439011", "507f191e810c19729de860ea"));
  });

  it("shows saved state and unsaves the matching saved repository", async () => {
    api.lookupSaved.mockResolvedValue({ savedId: "507f191e810c19729de860eb" });
    renderButton();
    await userEvent.click(await screen.findByRole("button", { name: /Saved.*Unsave/ }));
    await waitFor(() => expect(api.unsaveRepository).toHaveBeenCalledWith("507f191e810c19729de860eb"));
  });
});
