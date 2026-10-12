import { Schema, model } from "mongoose";
const runSchema = new Schema({
  workspaceKey: { type: String, required: true }, watchlistId: { type: Schema.Types.ObjectId, required: true },
  status: { type: String, enum: ["queued","running","completed","partially_complete","failed","cancelled"], required: true },
  startedAt: { type: Date, default: null }, completedAt: { type: Date, default: null },
  checked: { type: Number, default: 0 }, changed: { type: Number, default: 0 }, unchanged: { type: Number, default: 0 },
  failed: { type: Number, default: 0 }, rateLimited: { type: Number, default: 0 }, requestId: { type: String, required: true },
  safeErrors: { type: [{ savedId: String, code: String }], default: [] }
  ,active: { type: Boolean, required: true, default: true }
}, { timestamps: true, collection: "watch_check_runs" });
runSchema.index({ workspaceKey: 1, watchlistId: 1, createdAt: -1, _id: -1 });
runSchema.index({ workspaceKey: 1, watchlistId: 1, status: 1 });
runSchema.index({ workspaceKey: 1, status: 1, createdAt: -1 });
runSchema.index({ workspaceKey: 1, watchlistId: 1, active: 1 }, { unique: true, partialFilterExpression: { active: true } });
export const WatchCheckRunModel = model("WatchCheckRun", runSchema);
