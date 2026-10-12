import { OperationQuotaModel } from "../models/quota.model.js";
import { currentWorkspace } from "./workspaceContext.js";
import { AppError } from "../middleware/errorHandler.js";

export async function consumeQuota(operation: string, limit: number, windowMs: number): Promise<void> {
  if (limit < 1) throw new AppError(503, "OPERATION_DISABLED", "This operation is currently unavailable");
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const expiresAt = new Date(windowStart.getTime() + windowMs * 2);
  const quota = await OperationQuotaModel.findOneAndUpdate(
    { workspaceKey: currentWorkspace(), operation, windowStart },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  if (!quota || quota.count > limit) throw new AppError(429, "QUOTA_EXCEEDED", "The private workspace has reached its temporary usage limit");
}
