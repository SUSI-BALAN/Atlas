import { afterEach, describe, expect, it, vi } from "vitest";
import { currentWorkspace, runInWorkspace } from "./workspaceContext.js";
afterEach(() => vi.unstubAllEnvs());
describe("server-resolved workspace context", () => {
  it("propagates identity into queued async search work", async () => {
    const key = await runInWorkspace("workspace-a", () => new Promise<string>(resolve => queueMicrotask(() => resolve(currentWorkspace()))));
    expect(key).toBe("workspace-a");
  });
  it("fails closed without an authenticated context outside isolated tests", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => currentWorkspace()).toThrow("Authenticated workspace context required");
  });
});
