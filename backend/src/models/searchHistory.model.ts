import { Schema, model } from "mongoose";

const searchHistorySchema = new Schema({
  query: { type: String, required: true },
  sources: { type: [String], required: true },
  types: { type: [String], required: true },
  filters: { type: Schema.Types.Mixed, required: true },
  sort: { type: String, required: true },
  resultCount: { type: Number, required: true },
  status: { type: String, required: true },
  requestId: { type: String, required: true, index: true },
  searchedAt: { type: Date, required: true, default: Date.now }
}, { timestamps: false, minimize: false });

searchHistorySchema.index({ searchedAt: -1 });
export const SearchHistoryModel = model("SearchHistory", searchHistorySchema);
