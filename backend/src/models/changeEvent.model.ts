import { Schema, model } from "mongoose";
const changeEventSchema = new Schema({
  workspaceKey: { type: String, required: true, default: "default" }, watchlistId: { type: Schema.Types.ObjectId, required: true },
  savedId: { type: Schema.Types.ObjectId, required: true }, source: { type: String, required: true }, externalId: { type: String, required: true },
  detectedAt: { type: Date, required: true }, changeTypes: { type: [String], required: true }, changes: { type: Schema.Types.Mixed, required: true },
  previousFingerprint: { type: String, required: true }, currentFingerprint: { type: String, required: true }, checkRunId: { type: Schema.Types.ObjectId, required: true }
}, { timestamps: true, collection: "change_events", minimize: false });
changeEventSchema.index({ workspaceKey: 1, detectedAt: -1, _id: -1 });
changeEventSchema.index({ workspaceKey: 1, watchlistId: 1, detectedAt: -1, _id: -1 });
changeEventSchema.index({ workspaceKey: 1, savedId: 1, detectedAt: -1, _id: -1 });
changeEventSchema.index({ workspaceKey: 1, checkRunId: 1, savedId: 1 }, { unique: true });
export const ChangeEventModel = model("ChangeEvent", changeEventSchema);
