import { Schema, model } from "mongoose";

const watchlistSchema = new Schema({
  workspaceKey: { type: String, required: true, default: "default" },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, default: "", maxlength: 2000 },
  enabled: { type: Boolean, required: true, default: true },
  checkIntervalMinutes: { type: Number, required: true, min: 15, max: 10080, default: 1440 },
  lastCheckedAt: { type: Date, default: null }, nextCheckAt: { type: Date, default: null }
}, { timestamps: true, collection: "watchlists" });
watchlistSchema.index({ workspaceKey: 1, createdAt: -1, _id: -1 });
watchlistSchema.index({ workspaceKey: 1, enabled: 1, nextCheckAt: 1, _id: 1 });
export const WatchlistModel = model("Watchlist", watchlistSchema);

const membershipSchema = new Schema({
  workspaceKey: { type: String, required: true, default: "default" },
  watchlistId: { type: Schema.Types.ObjectId, ref: "Watchlist", required: true },
  savedId: { type: Schema.Types.ObjectId, ref: "SavedRepository", required: true }
}, { timestamps: true, collection: "watchlist_memberships" });
membershipSchema.index({ workspaceKey: 1, watchlistId: 1, savedId: 1 }, { unique: true });
membershipSchema.index({ workspaceKey: 1, savedId: 1, watchlistId: 1 });
export const WatchlistMembershipModel = model("WatchlistMembership", membershipSchema);
