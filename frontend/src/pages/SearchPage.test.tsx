import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SearchPage } from "./SearchPage";

describe("SearchPage", () => {
  it("renders provider-neutral search controls", () => {
    render(<QueryClientProvider client={new QueryClient()}><SearchPage /></QueryClientProvider>);
    expect(screen.getByRole("heading", { name: /collect all available results/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /research query/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start research/i })).toBeInTheDocument();
  });
});
