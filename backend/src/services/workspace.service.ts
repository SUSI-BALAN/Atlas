import { Types } from "mongoose";
import { AppError } from "../middleware/errorHandler.js";
import { CollectionMembershipModel, CollectionModel } from "../models/collection.model.js";
import { RepositoryResultModel } from "../models/repositoryResult.model.js";
import { SavedRepositoryModel } from "../models/savedRepository.model.js";

const workspaceKey = "default";
const oid = (value: string, code = "INVALID_ID") => { if (!Types.ObjectId.isValid(value)) throw new AppError(400, code, "Identifier is invalid"); return new Types.ObjectId(value); };
const iso = (value: unknown) => value instanceof Date ? value.toISOString() : null;

export class WorkspaceService {
  async save(jobId: string, repositoryId: string) {
    const repository = await RepositoryResultModel.findOne({ _id: oid(repositoryId, "INVALID_REPOSITORY_ID"), jobId: oid(jobId, "INVALID_JOB_ID") }).lean();
    if (!repository) throw new AppError(404, "REPOSITORY_RESULT_NOT_FOUND", "Repository result was not found for this search job");
    const document = await SavedRepositoryModel.findOneAndUpdate(
      { workspaceKey, source: repository.source, externalId: repository.externalId },
      { $setOnInsert: savedDocument(repository) }, { upsert: true, new: true }
    ).lean();
    return savedView(document as Record<string, unknown>);
  }
  async lookup(source: string, externalId: string) { const row = await SavedRepositoryModel.findOne({ workspaceKey, source, externalId }).lean(); return row ? savedView(row) : null; }
  async get(savedId: string) { const row = await SavedRepositoryModel.findOne({ _id: oid(savedId, "INVALID_SAVED_ID"), workspaceKey }).lean(); if (!row) throw new AppError(404, "SAVED_REPOSITORY_NOT_FOUND", "Saved repository was not found"); return savedView(row); }
  async list(input: { cursor?: string | undefined; limit: number; source?: string | undefined; language?: string | undefined; tag?: string | undefined; collection?: string | undefined; text?: string | undefined }) {
    const query: Record<string, unknown> = { workspaceKey };
    if (input.cursor) query._id = { $lt: oid(input.cursor, "INVALID_CURSOR") };
    if (input.source) query.source = input.source;
    if (input.language) query.language = new RegExp(`^${escapeRegex(input.language)}$`, "i");
    if (input.tag) query.tags = input.tag;
    if (input.text) query.$or = ["fullName", "description", "note"].map((field) => ({ [field]: new RegExp(escapeRegex(input.text!), "i") }));
    if (input.collection) { const memberships = await CollectionMembershipModel.find({ workspaceKey, collectionId: oid(input.collection, "INVALID_COLLECTION_ID") }).select({ savedId: 1 }).lean(); query._id = { ...(query._id as object ?? {}), $in: memberships.map((item) => item.savedId) }; }
    const rows = await SavedRepositoryModel.find(query).sort({ _id: -1 }).limit(input.limit + 1).lean(); const hasMore = rows.length > input.limit; const page = rows.slice(0, input.limit);
    return { repositories: page.map(savedView), nextCursor: page.at(-1)?._id ? String(page.at(-1)!._id) : input.cursor ?? null, hasMore };
  }
  async update(savedId: string, patch: { note?: string | undefined; tags?: string[] | undefined }) { const row = await SavedRepositoryModel.findOneAndUpdate({ _id: oid(savedId, "INVALID_SAVED_ID"), workspaceKey }, { $set: patch }, { new: true }).lean(); if (!row) throw new AppError(404, "SAVED_REPOSITORY_NOT_FOUND", "Saved repository was not found"); return savedView(row); }
  async remove(savedId: string) { const id = oid(savedId, "INVALID_SAVED_ID"); const row = await SavedRepositoryModel.findOneAndDelete({ _id: id, workspaceKey }).lean(); if (!row) throw new AppError(404, "SAVED_REPOSITORY_NOT_FOUND", "Saved repository was not found"); await CollectionMembershipModel.deleteMany({ workspaceKey, savedId: id }); return { deleted: true }; }
  async summary() { const [savedRepositories, collections] = await Promise.all([SavedRepositoryModel.countDocuments({ workspaceKey }), CollectionModel.countDocuments({ workspaceKey })]); return { savedRepositories, collections }; }

  async createCollection(input: { name: string; description: string }) { return collectionView((await CollectionModel.create({ workspaceKey, ...input })).toObject(), 0); }
  async listCollections() { const rows = await CollectionModel.find({ workspaceKey }).sort({ createdAt: -1, _id: -1 }).lean(); return Promise.all(rows.map(async (row) => collectionView(row, await CollectionMembershipModel.countDocuments({ workspaceKey, collectionId: row._id })))); }
  async getCollection(id: string) { const row = await CollectionModel.findOne({ _id: oid(id, "INVALID_COLLECTION_ID"), workspaceKey }).lean(); if (!row) throw new AppError(404, "COLLECTION_NOT_FOUND", "Collection was not found"); return collectionView(row, await CollectionMembershipModel.countDocuments({ workspaceKey, collectionId: row._id })); }
  async updateCollection(id: string, patch: { name?: string | undefined; description?: string | undefined }) { const row = await CollectionModel.findOneAndUpdate({ _id: oid(id, "INVALID_COLLECTION_ID"), workspaceKey }, { $set: patch }, { new: true }).lean(); if (!row) throw new AppError(404, "COLLECTION_NOT_FOUND", "Collection was not found"); return collectionView(row, await CollectionMembershipModel.countDocuments({ workspaceKey, collectionId: row._id })); }
  async deleteCollection(id: string) { const collectionId = oid(id, "INVALID_COLLECTION_ID"); const row = await CollectionModel.findOneAndDelete({ _id: collectionId, workspaceKey }).lean(); if (!row) throw new AppError(404, "COLLECTION_NOT_FOUND", "Collection was not found"); await CollectionMembershipModel.deleteMany({ workspaceKey, collectionId }); return { deleted: true }; }
  async addMembership(collectionIdValue: string, savedIdValue: string) { const collection = await this.getCollection(collectionIdValue); await this.get(savedIdValue); await CollectionMembershipModel.updateOne({ workspaceKey, collectionId: oid(collectionIdValue), savedId: oid(savedIdValue) }, { $setOnInsert: { workspaceKey } }, { upsert: true }); return collection; }
  async removeMembership(collectionIdValue: string, savedIdValue: string) { await this.getCollection(collectionIdValue); await CollectionMembershipModel.deleteOne({ workspaceKey, collectionId: oid(collectionIdValue), savedId: oid(savedIdValue) }); return { deleted: true }; }
}

function savedDocument(row: Record<string, unknown>) { const fields = ["source","externalId","owner","name","fullName","description","repositoryUrl","language","languages","topics","stars","forks","watchers","openIssues","license","archived","fork","visibility"] as const; const output: Record<string, unknown> = { workspaceKey, note: "", tags: [], savedFrom: { jobId: row.jobId, repositoryId: row._id }, sourceCreatedAt: row.sourceCreatedAt ?? null, sourceUpdatedAt: row.sourceUpdatedAt ?? null, pushedAt: row.pushedAt ?? null, sourceMetadata: safeMetadata(row.sourceMetadata) }; for (const field of fields) output[field] = row[field]; return output; }
function savedView(row: Record<string, unknown>) { return { savedId: String(row._id), source: String(row.source), externalId: String(row.externalId), owner: String(row.owner ?? ""), name: String(row.name ?? ""), fullName: String(row.fullName ?? ""), description: typeof row.description === "string" ? row.description : null, repositoryUrl: String(row.repositoryUrl), language: typeof row.language === "string" ? row.language : null, languages: Array.isArray(row.languages) ? row.languages.map(String) : [], topics: Array.isArray(row.topics) ? row.topics.map(String) : [], stars: Number(row.stars ?? 0), forks: Number(row.forks ?? 0), watchers: typeof row.watchers === "number" ? row.watchers : null, openIssues: typeof row.openIssues === "number" ? row.openIssues : null, license: typeof row.license === "string" ? row.license : null, sourceCreatedAt: iso(row.sourceCreatedAt), sourceUpdatedAt: iso(row.sourceUpdatedAt), pushedAt: iso(row.pushedAt), archived: row.archived === true, fork: row.fork === true, visibility: typeof row.visibility === "string" ? row.visibility : null, sourceMetadata: safeMetadata(row.sourceMetadata), note: String(row.note ?? ""), tags: Array.isArray(row.tags) ? row.tags.map(String) : [], createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) }; }
function collectionView(row: Record<string, unknown>, repositoryCount: number) { return { collectionId: String(row._id), name: String(row.name), description: String(row.description ?? ""), repositoryCount, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) }; }
function safeMetadata(value: unknown) { if (!value || typeof value !== "object") return {}; const input = value as Record<string, unknown>; const allowed = ["repositoryId","projectId","pathWithNamespace","namespaceKind","ownerType","homepage","sizeKb","mirror","readmeUrl","lastActivityAt","duplicateOfRepositoryId"]; return Object.fromEntries(allowed.filter((key) => input[key] !== undefined).map((key) => [key, input[key]])); }
function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
export const workspaceService = new WorkspaceService();
