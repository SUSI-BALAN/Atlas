import { Schema, model } from "mongoose";

const searchCacheSchema = new Schema({
  cacheKey: { type: String, required: true, unique: true },
  jobId: { type: Schema.Types.ObjectId, ref: "SearchJob", required: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true, collection: "search_cache" });
searchCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const SearchCacheModel = model("SearchCache", searchCacheSchema);
