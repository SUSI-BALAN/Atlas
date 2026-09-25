import { createHash } from "node:crypto";
import { Types } from "mongoose";
import type { ConnectorRegistry } from "../../connectors/core/connectorRegistry.js";
import { ConnectorError } from "../../connectors/core/connector.errors.js";
import { logger } from "../../config/logger.js";
import { env } from "../../config/env.js";
import { isDatabaseConnected } from "../../database/mongoose.js";
import { RepositoryResultModel } from "../../models/repositoryResult.model.js";
import { SearchCacheModel } from "../../models/searchCache.model.js";
import { SearchJobModel } from "../../models/searchJob.model.js";
import { AppError } from "../../middleware/errorHandler.js";
import type { NormalizedRepository, RepositorySearchBatch, RepositorySearchRequest, RepositorySource } from "../../types/repositorySearch.js";
import type { SearchJobSnapshot, SearchJobStatus, SourceProgress } from "../../types/searchJob.js";

interface CreateInput extends Omit<RepositorySearchRequest, "sources" | "resultLimit"> { sources: RepositorySource[] | "all"; resultLimit?: number | null | undefined; }
interface ResultPage { results: NormalizedRepository[]; nextCursor: string | null; hasMore: boolean; }

export class SearchJobService {
  readonly #controllers = new Map<string, AbortController>();
  readonly #memoryJobs = new Map<string, SearchJobSnapshot>();
  readonly #memoryResults = new Map<string, NormalizedRepository[]>();

  constructor(private readonly registry: ConnectorRegistry, private readonly concurrency: number) {}

  async create(input: CreateInput, requestId: string): Promise<SearchJobSnapshot> {
    const enabled = this.registry.list().filter((connector) => connector.enabled && connector.capabilities.repositories).map((connector) => connector.id as RepositorySource);
    const sources = input.sources === "all" ? enabled : input.sources.filter((source) => enabled.includes(source));
    if (sources.length === 0) throw new AppError(400, "NO_ENABLED_SOURCES", "No selected repository connector is enabled");
    const request: RepositorySearchRequest = { ...input, sources, resultLimit: input.resultLimit ?? null };
    if (request.collectionMode === "all" && !isDatabaseConnected()) throw new AppError(503, "DATABASE_REQUIRED", "All-results collection requires MongoDB so batches are not retained in process memory");
    const cacheKey = searchCacheKey(request);
    const cached = await this.cachedJob(cacheKey);
    if (cached) return { ...cached, cached: true };

    const now = new Date().toISOString();
    const sourceProgress = sources.map((source): SourceProgress => ({ source, status: "queued", fetched: 0, pages: 0, total: null, rateLimit: null, cursor: null, error: null, updatedAt: now }));
    let snapshot: SearchJobSnapshot;
    if (isDatabaseConnected()) {
      const document = await SearchJobModel.create({ status: "queued", request, cacheKey, sourceProgress, totalUnique: 0, cancelRequested: false, cached: false, requestId });
      snapshot = toSnapshot(document.toObject());
    } else {
      const jobId = new Types.ObjectId().toString();
      snapshot = { jobId, status: "queued", request, sourceProgress, totalUnique: 0, cancelRequested: false, cached: false, createdAt: now, startedAt: null, completedAt: null };
      this.#memoryJobs.set(jobId, snapshot);
      this.#memoryResults.set(jobId, []);
    }
    queueMicrotask(() => void this.run(snapshot.jobId, cacheKey, requestId));
    return snapshot;
  }

  async get(jobId: string): Promise<SearchJobSnapshot> {
    assertObjectId(jobId);
    if (isDatabaseConnected()) {
      const document = await SearchJobModel.findById(jobId).lean();
      if (!document) throw new AppError(404, "SEARCH_JOB_NOT_FOUND", "Search job was not found");
      return toSnapshot(document);
    }
    const job = this.#memoryJobs.get(jobId);
    if (!job) throw new AppError(404, "SEARCH_JOB_NOT_FOUND", "Search job was not found");
    return job;
  }

  async results(jobId: string, cursor: string | undefined, limit: number): Promise<ResultPage> {
    await this.get(jobId);
    if (isDatabaseConnected()) {
      const query: Record<string, unknown> = { jobId: new Types.ObjectId(jobId) };
      if (cursor) query._id = { $gt: new Types.ObjectId(cursor) };
      const documents = await RepositoryResultModel.find(query).sort({ _id: 1 }).limit(limit + 1).lean();
      const hasMore = documents.length > limit;
      const page = documents.slice(0, limit);
      return { results: page.map(repositoryFromDocument), nextCursor: page.length > 0 ? String(page.at(-1)?._id) : cursor ?? null, hasMore };
    }
    const offset = cursor ? Number.parseInt(cursor.slice(-6), 16) : 0;
    const rows = this.#memoryResults.get(jobId) ?? [];
    const page = rows.slice(offset, offset + limit);
    const next = offset + page.length;
    return { results: page, nextCursor: page.length > 0 ? next.toString(16).padStart(24, "0") : cursor ?? null, hasMore: next < rows.length };
  }

  async cancel(jobId: string): Promise<SearchJobSnapshot> {
    const job = await this.get(jobId);
    if (["completed", "cancelled", "failed", "partially_complete"].includes(job.status)) return job;
    this.#controllers.get(jobId)?.abort(new DOMException("Search cancelled", "AbortError"));
    await this.patchJob(jobId, { cancelRequested: true, status: "cancelled", completedAt: new Date().toISOString() });
    return this.get(jobId);
  }

  async retrySource(jobId: string, source: RepositorySource, requestId: string): Promise<SearchJobSnapshot> {
    const job = await this.get(jobId);
    if (!job.request.sources.includes(source)) throw new AppError(400, "SOURCE_NOT_IN_JOB", "Source is not part of this job");
    const controller = this.#controllers.get(jobId) ?? new AbortController();
    this.#controllers.set(jobId, controller);
    const progress = job.sourceProgress.find((entry) => entry.source === source);
    void this.processSource(jobId, source, job.request, requestId, controller.signal, progress?.cursor?.partition === null ? (progress.cursor.page + 1) : undefined).then(() => this.finalize(jobId, searchCacheKey(job.request)));
    return this.get(jobId);
  }

  private async run(jobId: string, cacheKey: string, requestId: string): Promise<void> {
    const controller = new AbortController();
    this.#controllers.set(jobId, controller);
    await this.patchJob(jobId, { status: "running", startedAt: new Date().toISOString() });
    const job = await this.get(jobId);
    await mapLimit(job.request.sources, this.concurrency, (source) => this.processSource(jobId, source, job.request, requestId, controller.signal));
    await this.finalize(jobId, cacheKey);
    this.#controllers.delete(jobId);
  }

  private async processSource(jobId: string, source: RepositorySource, request: RepositorySearchRequest, requestId: string, signal: AbortSignal, resumePage?: number): Promise<void> {
    const connector = this.registry.get(source);
    if (!connector?.enabled) { await this.patchSource(jobId, source, { status: "failed", error: { code: "DISABLED", message: "Connector is disabled", retryable: false } }); return; }
    await this.patchSource(jobId, source, { status: "running", error: null });
    try {
      for await (const batch of connector.searchRepositories({ ...request, sources: [source] }, { requestId, jobId, signal, resumePage, onRateLimit: async ({ rateLimit }) => { await this.patchSource(jobId, source, { status: "rate_limited", rateLimit }); await this.patchJob(jobId, { status: "rate_limited" }); } })) {
        await this.persistBatch(jobId, batch);
        const current = (await this.get(jobId)).sourceProgress.find((entry) => entry.source === source);
        await this.patchSource(jobId, source, {
          status: "running", fetched: (current?.fetched ?? 0) + batch.repositories.length, pages: batch.page,
          total: batch.total, rateLimit: batch.rateLimit, cursor: { page: batch.page, partition: batch.partition }, providerLimited: Boolean(batch.providerLimited || current?.providerLimited)
        });
        await this.patchJob(jobId, { status: "running" });
      }
      await this.patchSource(jobId, source, { status: "completed" });
    } catch (error) {
      if (signal.aborted || (error instanceof Error && error.name === "AbortError")) { await this.patchSource(jobId, source, { status: "cancelled" }); return; }
      const connectorError = error instanceof ConnectorError ? error : null;
      await this.patchSource(jobId, source, {
        status: connectorError?.code === "rate_limited" ? "rate_limited" : "failed",
        error: { code: connectorError?.code.toUpperCase() ?? "CONNECTOR_ERROR", message: connectorError?.message ?? "Connector search failed", retryable: connectorError?.retryable ?? false },
        rateLimit: connector?.getRateLimitStatus() ?? null
      });
      logger.warn({ err: error, connector: source, jobId }, "Search job source stopped");
    }
  }

  private async persistBatch(jobId: string, batch: RepositorySearchBatch): Promise<void> {
    const uniqueRepositories = [...new Map(batch.repositories.map((repository) => [`${repository.source}\0${repository.externalId}`, repository])).values()];
    if (isDatabaseConnected()) {
      const jobObjectId = new Types.ObjectId(jobId);
      if (uniqueRepositories.length > 0) {
        const canonicalUrls = [...new Set(uniqueRepositories.map((repository) => canonicalizeUrl(repository.repositoryUrl)))];
        const existingUrls = await RepositoryResultModel.find({ jobId: jobObjectId, canonicalUrl: { $in: canonicalUrls } }).select({ _id: 1, canonicalUrl: 1 }).lean();
        const canonicalOwners = new Map(existingUrls.map((row) => [String(row.canonicalUrl), row._id]));
        const operations = uniqueRepositories.map((repository) => {
          const canonicalUrl = canonicalizeUrl(repository.repositoryUrl);
          const documentId = new Types.ObjectId();
          const duplicateUrlOf = canonicalOwners.get(canonicalUrl) ?? null;
          if (!duplicateUrlOf) canonicalOwners.set(canonicalUrl, documentId);
          return {
            updateOne: {
              filter: { jobId: jobObjectId, source: repository.source, externalId: repository.externalId },
              update: { $setOnInsert: repositoryDocument(jobObjectId, repository, documentId, duplicateUrlOf) }, upsert: true
            }
          };
        });
        await RepositoryResultModel.bulkWrite(operations, { ordered: false });
      }
      const totalUnique = await RepositoryResultModel.countDocuments({ jobId: jobObjectId });
      await this.patchJob(jobId, { totalUnique });
      return;
    }
    const rows = this.#memoryResults.get(jobId) ?? [];
    const seen = new Set(rows.map((entry) => `${entry.source}\0${entry.externalId}`));
    const canonicalOwners = new Map(rows.map((entry) => [canonicalizeUrl(entry.repositoryUrl), entry.id]));
    for (const repository of uniqueRepositories) {
      const key = `${repository.source}\0${repository.externalId}`;
      if (!seen.has(key)) {
        const canonicalUrl = canonicalizeUrl(repository.repositoryUrl);
        const duplicateUrlOf = canonicalOwners.get(canonicalUrl);
        rows.push(duplicateUrlOf ? { ...repository, sourceMetadata: { ...repository.sourceMetadata, duplicateUrlOf } } : repository);
        if (!duplicateUrlOf) canonicalOwners.set(canonicalUrl, repository.id);
        seen.add(key);
      }
    }
    this.#memoryResults.set(jobId, rows);
    await this.patchJob(jobId, { totalUnique: rows.length });
  }

  private async finalize(jobId: string, cacheKey: string): Promise<void> {
    const job = await this.get(jobId);
    if (job.cancelRequested || job.sourceProgress.some((entry) => entry.status === "cancelled")) { await this.patchJob(jobId, { status: "cancelled", completedAt: new Date().toISOString() }); return; }
    const failed = job.sourceProgress.filter((entry) => entry.status === "failed").length;
    const limited = job.sourceProgress.filter((entry) => entry.status === "rate_limited").length;
    const completed = job.sourceProgress.filter((entry) => entry.status === "completed").length;
    const status: SearchJobStatus = limited > 0 && completed === 0 ? "rate_limited" : failed + limited > 0 && completed > 0 ? "partially_complete" : completed === 0 ? "failed" : "completed";
    await this.patchJob(jobId, { status, completedAt: new Date().toISOString() });
    if (isDatabaseConnected() && (status === "completed" || status === "partially_complete") && env.SEARCH_CACHE_TTL_SECONDS > 0) {
      await SearchCacheModel.updateOne({ cacheKey }, { $set: { jobId: new Types.ObjectId(jobId), expiresAt: new Date(Date.now() + env.SEARCH_CACHE_TTL_SECONDS * 1000) } }, { upsert: true });
    }
  }

  private async cachedJob(cacheKey: string): Promise<SearchJobSnapshot | null> {
    if (!isDatabaseConnected() || env.SEARCH_CACHE_TTL_SECONDS === 0) return null;
    const cache = await SearchCacheModel.findOne({ cacheKey, expiresAt: { $gt: new Date() } }).lean();
    if (!cache) return null;
    const job = await SearchJobModel.findById(cache.jobId).lean();
    return job ? toSnapshot(job) : null;
  }

  private async patchJob(jobId: string, patch: Record<string, unknown>): Promise<void> {
    if (isDatabaseConnected()) { await SearchJobModel.updateOne({ _id: jobId }, { $set: normalizeDatePatch(patch) }); return; }
    const job = this.#memoryJobs.get(jobId); if (job) this.#memoryJobs.set(jobId, { ...job, ...patch } as SearchJobSnapshot);
  }

  private async patchSource(jobId: string, source: RepositorySource, patch: Partial<SourceProgress>): Promise<void> {
    const job = await this.get(jobId);
    const sourceProgress = job.sourceProgress.map((entry) => entry.source === source ? { ...entry, ...patch, updatedAt: new Date().toISOString() } : entry);
    await this.patchJob(jobId, { sourceProgress });
  }
}

function repositoryDocument(jobId: Types.ObjectId, repository: NormalizedRepository, documentId: Types.ObjectId, duplicateUrlOf: Types.ObjectId | null) {
  const { id: _id, createdAt, updatedAt, ...rest } = repository;
  return { ...rest, _id: documentId, jobId, canonicalUrl: canonicalizeUrl(repository.repositoryUrl), duplicateUrlOf, sourceCreatedAt: createdAt ? new Date(createdAt) : null, sourceUpdatedAt: updatedAt ? new Date(updatedAt) : null, pushedAt: repository.pushedAt ? new Date(repository.pushedAt) : null };
}
function repositoryFromDocument(document: Record<string, unknown>): NormalizedRepository {
  const date = (value: unknown): string | null => value instanceof Date ? value.toISOString() : null;
  return {
    id: `${String(document.source)}:${String(document.externalId)}`, source: document.source as RepositorySource, externalId: String(document.externalId),
    owner: String(document.owner ?? ""), name: String(document.name ?? ""), fullName: String(document.fullName ?? ""), description: typeof document.description === "string" ? document.description : null,
    repositoryUrl: String(document.repositoryUrl), cloneUrl: typeof document.cloneUrl === "string" ? document.cloneUrl : null, defaultBranch: typeof document.defaultBranch === "string" ? document.defaultBranch : null,
    language: typeof document.language === "string" ? document.language : null, languages: Array.isArray(document.languages) ? document.languages.map(String) : [], topics: Array.isArray(document.topics) ? document.topics.map(String) : [],
    stars: Number(document.stars ?? 0), forks: Number(document.forks ?? 0), watchers: typeof document.watchers === "number" ? document.watchers : null, openIssues: typeof document.openIssues === "number" ? document.openIssues : null,
    license: typeof document.license === "string" ? document.license : null, createdAt: date(document.sourceCreatedAt), updatedAt: date(document.sourceUpdatedAt), pushedAt: date(document.pushedAt), archived: document.archived === true, fork: document.fork === true,
    visibility: typeof document.visibility === "string" ? document.visibility : null, sourceMetadata: typeof document.sourceMetadata === "object" && document.sourceMetadata !== null ? document.sourceMetadata as Record<string, unknown> : {}
  };
}
function toSnapshot(document: Record<string, unknown>): SearchJobSnapshot {
  const iso = (value: unknown): string | null => value instanceof Date ? value.toISOString() : typeof value === "string" ? value : null;
  return { jobId: String(document._id ?? document.jobId), status: document.status as SearchJobStatus, request: document.request as RepositorySearchRequest, sourceProgress: document.sourceProgress as SourceProgress[], totalUnique: Number(document.totalUnique ?? 0), cancelRequested: document.cancelRequested === true, cached: document.cached === true, createdAt: iso(document.createdAt) ?? new Date().toISOString(), startedAt: iso(document.startedAt), completedAt: iso(document.completedAt) };
}
function normalizeDatePatch(patch: Record<string, unknown>): Record<string, unknown> { const copy = { ...patch }; for (const key of ["startedAt", "completedAt"]) if (typeof copy[key] === "string") copy[key] = new Date(copy[key]); return copy; }
function searchCacheKey(request: RepositorySearchRequest): string {
  const normalized = {
    ...request, query: request.query.trim().replace(/\s+/g, " ").toLocaleLowerCase(), sources: [...request.sources].sort(),
    filters: { ...request.filters, language: request.filters.language ? [...request.filters.language].map((value) => value.toLocaleLowerCase()).sort() : undefined, topic: request.filters.topic ? [...request.filters.topic].map((value) => value.toLocaleLowerCase()).sort() : undefined, license: request.filters.license ? [...request.filters.license].map((value) => value.toLocaleLowerCase()).sort() : undefined }
  };
  return createHash("sha256").update(stableStringify(normalized)).digest("hex");
}
function stableStringify(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`; if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`; return JSON.stringify(value); }
export function canonicalizeRepositoryUrl(value: string): string { try { const url = new URL(value); url.hash = ""; url.search = ""; url.hostname = url.hostname.toLowerCase(); url.pathname = url.pathname.replace(/\/+$/, "").replace(/\.git$/i, "").toLowerCase(); return url.toString(); } catch { return value.trim(); } }
const canonicalizeUrl = canonicalizeRepositoryUrl;
function assertObjectId(value: string): void { if (!Types.ObjectId.isValid(value)) throw new AppError(400, "INVALID_JOB_ID", "Search job ID is invalid"); }
async function mapLimit<T>(values: T[], limit: number, task: (value: T) => Promise<void>): Promise<void> { let cursor = 0; async function worker() { while (cursor < values.length) { const value = values[cursor++]; if (value !== undefined) await task(value); } } await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker)); }
