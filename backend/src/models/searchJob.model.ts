import { Schema, model } from "mongoose";

const searchJobSchema = new Schema({
  status: { type: String, required: true, index: true },
  request: { type: Schema.Types.Mixed, required: true },
  cacheKey: { type: String, required: true, index: true },
  sourceProgress: { type: [Schema.Types.Mixed], required: true, default: [] },
  totalUnique: { type: Number, required: true, default: 0 },
  cancelRequested: { type: Boolean, required: true, default: false },
  cached: { type: Boolean, required: true, default: false },
  requestId: { type: String, required: true, index: true },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null }
}, { timestamps: true, minimize: false, collection: "search_jobs" });

searchJobSchema.index({ createdAt: -1 });
export const SearchJobModel = model("SearchJob", searchJobSchema);
