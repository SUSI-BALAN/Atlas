import { Schema, model } from "mongoose";

const operationQuotaSchema = new Schema({
  workspaceKey: { type: String, required: true },
  operation: { type: String, required: true },
  windowStart: { type: Date, required: true },
  count: { type: Number, required: true, min: 0 },
  expiresAt: { type: Date, required: true }
}, { timestamps: false, collection: "operation_quotas" });

operationQuotaSchema.index({ workspaceKey: 1, operation: 1, windowStart: 1 }, { unique: true });
operationQuotaSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OperationQuotaModel = model("OperationQuota", operationQuotaSchema);
