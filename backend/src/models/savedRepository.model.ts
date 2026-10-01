import { Schema, model } from "mongoose";

const savedRepositorySchema = new Schema({
  workspaceKey: { type: String, required: true },
  source: { type: String, required: true }, externalId: { type: String, required: true },
  owner: String, name: String, fullName: String, description: { type: String, default: null },
  repositoryUrl: { type: String, required: true }, language: { type: String, default: null }, languages: [String], topics: [String],
  stars: Number, forks: Number, watchers: { type: Number, default: null }, openIssues: { type: Number, default: null }, license: { type: String, default: null },
  sourceCreatedAt: { type: Date, default: null }, sourceUpdatedAt: { type: Date, default: null }, pushedAt: { type: Date, default: null },
  archived: Boolean, fork: Boolean, visibility: { type: String, default: null }, sourceMetadata: Schema.Types.Mixed,
  note: { type: String, required: true, default: "" }, tags: { type: [String], required: true, default: [] },
  savedFrom: { jobId: { type: Schema.Types.ObjectId, required: true }, repositoryId: { type: Schema.Types.ObjectId, required: true } }
}, { timestamps: true, minimize: false, collection: "saved_repositories" });

savedRepositorySchema.index({ workspaceKey: 1, source: 1, externalId: 1 }, { unique: true });
savedRepositorySchema.index({ workspaceKey: 1, createdAt: -1, _id: -1 });
savedRepositorySchema.index({ workspaceKey: 1, tags: 1 });
savedRepositorySchema.index({ workspaceKey: 1, language: 1 });
export const SavedRepositoryModel = model("SavedRepository", savedRepositorySchema);
