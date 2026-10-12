import { afterEach, describe, expect, it, vi } from "vitest";
import { OperationQuotaModel } from "../models/quota.model.js";
import { runInWorkspace } from "./workspaceContext.js";
import { consumeQuota } from "./quota.service.js";

afterEach(() => vi.restoreAllMocks());

describe("persistent operation quotas", () => {
  it("increments one atomic workspace/window counter", async () => {
    const update = vi.spyOn(OperationQuotaModel, "findOneAndUpdate").mockReturnValue({ lean: async () => ({ count: 1 }) } as never);
    await runInWorkspace("guest_a", () => consumeQuota("search-job", 10, 900_000));
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceKey: "guest_a", operation: "search-job", windowStart: expect.any(Date) }),
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: expect.any(Date) } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  });

  it("rejects only the guest whose persistent counter exceeds its limit", async () => {
    vi.spyOn(OperationQuotaModel, "findOneAndUpdate").mockImplementation((filter: { workspaceKey: string }) => ({ lean: async () => ({ count: filter.workspaceKey === "guest_a" ? 6 : 1 }) }) as never);
    await expect(runInWorkspace("guest_a", () => consumeQuota("ai-generation", 5, 86400_000))).rejects.toMatchObject({ status: 429, code: "QUOTA_EXCEEDED" });
    await expect(runInWorkspace("guest_b", () => consumeQuota("ai-generation", 5, 86400_000))).resolves.toBeUndefined();
  });

  it("fails closed when persistent quota storage is unavailable", async () => {
    vi.spyOn(OperationQuotaModel, "findOneAndUpdate").mockImplementation(() => { throw new Error("database unavailable"); });
    await expect(runInWorkspace("guest_a", () => consumeQuota("watch-check", 5, 86400_000))).rejects.toThrow("database unavailable");
  });
});
