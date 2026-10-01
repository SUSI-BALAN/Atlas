import { Schema, model } from "mongoose";

const snapshotSchema = new Schema({
  stars: Number, forks: Number, watchers: { type: Number, default: null }, openIssues: { type: Number, default: null },
  defaultBranch: { type: String, default: null }, language: { type: String, default: null }, license: { type: String, default: null },
  archived: { type: Boolean, default: null }, visibility: { type: String, default: null }, description: { type: String, default: null },
  topics: { type: [String], default: [] }, sourceUpdatedAt: { type: Date, default: null }, pushedAt: { type: Date, default: null }
}, { _id: false, strict: true });

const stateSchema = new Schema({
  workspaceKey: { type: String, required: true },
  watchlistId: { type: Schema.Types.ObjectId, required: true }, savedId: { type: Schema.Types.ObjectId, required: true },
  source: { type: String, required: true }, externalId: { type: String, required: true },
  snapshot: { type: snapshotSchema, default: null }, fingerprint: { type: String, default: null },
  lastCheckedAt: { type: Date, default: null }, lastSuccessfulCheckAt: { type: Date, default: null },
  lastError: { code: String, category: String, occurredAt: Date }, consecutiveFailures: { type: Number, default: 0 }
}, { timestamps: true, collection: "repository_watch_states" });
stateSchema.index({ workspaceKey: 1, watchlistId: 1, savedId: 1 }, { unique: true });
stateSchema.index({ workspaceKey: 1, savedId: 1 });
export const RepositoryWatchStateModel = model("RepositoryWatchState", stateSchema);
