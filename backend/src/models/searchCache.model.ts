import { Schema, model } from "mongoose";

const searchCacheSchema = new Schema({
  workspaceKey: { type: String, required: true },
  cacheKey: { type: String, required: true },
  jobId: { type: Schema.Types.ObjectId, ref: "SearchJob", required: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true, collection: "search_cache" });
searchCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
searchCacheSchema.index({ workspaceKey: 1, cacheKey: 1 }, { unique: true });
export const SearchCacheModel = model("SearchCache", searchCacheSchema);
