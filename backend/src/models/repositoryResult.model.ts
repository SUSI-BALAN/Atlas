import { Schema, model } from "mongoose";

const repositoryResultSchema = new Schema({
  jobId: { type: Schema.Types.ObjectId, ref: "SearchJob", required: true, index: true },
  source: { type: String, required: true }, externalId: { type: String, required: true },
  owner: String, name: String, fullName: String, description: { type: String, default: null },
  repositoryUrl: { type: String, required: true }, canonicalUrl: { type: String, required: true, index: true }, cloneUrl: { type: String, default: null },
  defaultBranch: { type: String, default: null }, language: { type: String, default: null }, languages: [String], topics: [String],
  stars: Number, forks: Number, watchers: { type: Number, default: null }, openIssues: { type: Number, default: null }, license: { type: String, default: null },
  sourceCreatedAt: { type: Date, default: null }, sourceUpdatedAt: { type: Date, default: null }, pushedAt: { type: Date, default: null },
  archived: Boolean, fork: Boolean, visibility: { type: String, default: null }, sourceMetadata: Schema.Types.Mixed,
  duplicateUrlOf: { type: Schema.Types.ObjectId, default: null }
}, { timestamps: true, minimize: false, collection: "repository_results" });

repositoryResultSchema.index({ jobId: 1, source: 1, externalId: 1 }, { unique: true });
repositoryResultSchema.index({ jobId: 1, _id: 1 });
repositoryResultSchema.index({ jobId: 1, stars: -1 });
export const RepositoryResultModel = model("RepositoryResult", repositoryResultSchema);
