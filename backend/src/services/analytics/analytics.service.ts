import { currentWorkspace } from "../workspaceContext.js";
import { ChangeEventModel } from "../../models/changeEvent.model.js";
import { CollectionMembershipModel, CollectionModel } from "../../models/collection.model.js";
import { RepositoryResultModel } from "../../models/repositoryResult.model.js";
import { SavedRepositoryModel } from "../../models/savedRepository.model.js";
import { SearchJobModel } from "../../models/searchJob.model.js";
import { WatchCheckRunModel } from "../../models/watchCheckRun.model.js";
import { WatchlistMembershipModel, WatchlistModel } from "../../models/watchlist.model.js";


type Range = { from: Date; to: Date; source?: string; limit: number };
type Models = Record<string, any>;
const defaults: Models = { ChangeEventModel, CollectionMembershipModel, CollectionModel, RepositoryResultModel, SavedRepositoryModel, SearchJobModel, WatchCheckRunModel, WatchlistMembershipModel, WatchlistModel };
const list = (value: unknown): any[] => Array.isArray(value) ? value : [];
const percentage = (count: number, total: number) => total ? Number((count * 100 / total).toFixed(2)) : 0;

export class AnalyticsService {
  constructor(private readonly models: Models = defaults) {}

  async summary(range: Range) {
    const m = this.models;
    const [totalSearchJobs, completedSearchJobs, partiallyCompletedSearchJobs, totalCollectedRepositories, savedRepositories, collections, watchlists, recentChanges, enabledWatchlists, monitored, dates] = await Promise.all([
      m.SearchJobModel.countDocuments({ workspaceKey: currentWorkspace() }), m.SearchJobModel.countDocuments({ workspaceKey: currentWorkspace(), status: "completed" }), m.SearchJobModel.countDocuments({ workspaceKey: currentWorkspace(), status: "partially_complete" }),
      m.RepositoryResultModel.countDocuments({ workspaceKey: currentWorkspace() }), m.SavedRepositoryModel.countDocuments({ workspaceKey: currentWorkspace() }), m.CollectionModel.countDocuments({ workspaceKey: currentWorkspace() }), m.WatchlistModel.countDocuments({ workspaceKey: currentWorkspace() }),
      m.ChangeEventModel.countDocuments({ workspaceKey: currentWorkspace(), detectedAt: { $gte: range.from, $lte: range.to } }), m.WatchlistModel.countDocuments({ workspaceKey: currentWorkspace(), enabled: true }),
      m.WatchlistMembershipModel.aggregate([{ $match: { workspaceKey: currentWorkspace() } }, { $lookup: { from: "watchlists", localField: "watchlistId", foreignField: "_id", as: "watchlist" } }, { $unwind: "$watchlist" }, { $match: { "watchlist.workspaceKey": currentWorkspace(), "watchlist.enabled": true } }, { $group: { _id: "$savedId" } }, { $count: "count" }]),
      Promise.all([
        m.SearchJobModel.aggregate([{ $match: { workspaceKey: currentWorkspace() } }, { $group: { _id: null, value: { $max: "$createdAt" } } }]),
        m.SavedRepositoryModel.aggregate([{ $match: { workspaceKey: currentWorkspace() } }, { $group: { _id: null, value: { $max: "$createdAt" } } }]),
        m.ChangeEventModel.aggregate([{ $match: { workspaceKey: currentWorkspace() } }, { $group: { _id: null, value: { $max: "$detectedAt" } } }])
      ])
    ]);
    return { totalSearchJobs, completedSearchJobs, partiallyCompletedSearchJobs, totalCollectedRepositories, savedRepositories, collections, watchlists, recentChanges, enabledWatchlists, monitoredRepositories: list(monitored)[0]?.count ?? 0, lastSearchAt: list(dates[0])[0]?.value ?? null, lastSavedAt: list(dates[1])[0]?.value ?? null, lastChangeAt: list(dates[2])[0]?.value ?? null };
  }

  async sources() {
    const grouped = list(await this.models.RepositoryResultModel.aggregate([{ $match: { workspaceKey: currentWorkspace() } }, { $group: { _id: "$source", count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }]));
    const total = grouped.reduce((sum, row) => sum + row.count, 0);
    return { total, sources: grouped.map(row => ({ source: row._id, count: row.count, percentage: percentage(row.count, total) })), scope: "Atlas collected dataset" };
  }

  async languages(limit: number) {
    const grouped = list(await this.models.RepositoryResultModel.aggregate([{ $match: { workspaceKey: currentWorkspace() } }, { $group: { _id: { $ifNull: ["$language", "Unknown"] }, count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }]));
    const total = grouped.reduce((sum, row) => sum + row.count, 0);
    return { total, excludedCount: 0, languages: grouped.slice(0, limit).map(row => ({ language: row._id || "Unknown", count: row.count, percentage: percentage(row.count, total) })) };
  }

  async saved(limit: number) {
    const m = this.models;
    const [total, sources, languages, tags, usageRows] = await Promise.all([
      m.SavedRepositoryModel.countDocuments({ workspaceKey: currentWorkspace() }),
      this.groupSaved("$source"), this.groupSaved({ $ifNull: ["$language", "Unknown"] }),
      m.SavedRepositoryModel.aggregate([{ $match: { workspaceKey: currentWorkspace() } }, { $unwind: "$tags" }, { $match: { tags: { $ne: "" } } }, { $group: { _id: "$tags", count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: limit }]),
      m.CollectionMembershipModel.aggregate([{ $match: { workspaceKey: currentWorkspace() } }, { $group: { _id: "$savedId", collections: { $sum: 1 } } }, { $group: { _id: null, repositories: { $sum: 1 }, memberships: { $sum: "$collections" } } }])
    ]);
    const usage = list(usageRows)[0] ?? { repositories: 0, memberships: 0 };
    return { total, bySource: this.withPercent(sources, total, "source"), byLanguage: this.withPercent(list(languages).slice(0, limit), total, "language", "Unknown"), topTags: list(tags).map(row => ({ tag: row._id, count: row.count })), repositoriesInCollections: usage.repositories, repositoriesInZeroCollections: Math.max(0, total - usage.repositories), averageCollectionsPerSavedRepository: total ? Number((usage.memberships / total).toFixed(2)) : 0 };
  }

  async collections(limit: number) {
    const data = await this.models.CollectionModel.aggregate([
      { $match: { workspaceKey: currentWorkspace() } }, { $sort: { updatedAt: -1, _id: 1 } }, { $limit: limit },
      { $lookup: { from: "collection_memberships", let: { collectionId: "$_id" }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$collectionId", "$$collectionId"] }, { $eq: ["$workspaceKey", currentWorkspace()] }] } } }, { $lookup: { from: "saved_repositories", localField: "savedId", foreignField: "_id", as: "saved" } }, { $unwind: "$saved" }, { $match: { "saved.workspaceKey": currentWorkspace() } }, { $project: { source: "$saved.source", language: { $ifNull: ["$saved.language", "Unknown"] } } }], as: "repositories" } },
      { $project: { collectionId: { $toString: "$_id" }, name: 1, updatedAt: 1, repositoryCount: { $size: "$repositories" }, repositories: 1 } }
    ]);
    return { collections: list(data).map(row => ({ collectionId: row.collectionId, name: row.name, updatedAt: row.updatedAt, repositoryCount: row.repositoryCount, sourceDistribution: this.distribution(row.repositories, "source"), languageDistribution: this.distribution(row.repositories, "language") })) };
  }

  async watchlists(range: Range) {
    const m = this.models;
    const [total, enabled, monitored, statuses, changes, mostRecent, watchlists] = await Promise.all([
      m.WatchlistModel.countDocuments({ workspaceKey: currentWorkspace() }), m.WatchlistModel.countDocuments({ workspaceKey: currentWorkspace(), enabled: true }),
      m.WatchlistMembershipModel.aggregate([{ $match: { workspaceKey: currentWorkspace() } }, { $lookup: { from: "watchlists", localField: "watchlistId", foreignField: "_id", as: "watchlist" } }, { $unwind: "$watchlist" }, { $match: { "watchlist.workspaceKey": currentWorkspace(), "watchlist.enabled": true } }, { $group: { _id: "$savedId" } }, { $count: "count" }]),
      m.WatchCheckRunModel.aggregate([{ $match: { workspaceKey: currentWorkspace() } }, { $group: { _id: "$status", count: { $sum: 1 }, rateLimited: { $sum: "$rateLimited" } } }]),
      m.ChangeEventModel.aggregate([{ $match: { workspaceKey: currentWorkspace(), detectedAt: { $gte: range.from, $lte: range.to } } }, { $group: { _id: "$watchlistId", count: { $sum: 1 } } }]),
      m.WatchCheckRunModel.aggregate([{ $match: { workspaceKey: currentWorkspace() } }, { $group: { _id: null, value: { $max: "$startedAt" } } }]),
      m.WatchlistModel.aggregate([{ $match: { workspaceKey: currentWorkspace() } }, { $sort: { updatedAt: -1, _id: 1 } }, { $limit: range.limit }, { $lookup: { from: "watchlist_memberships", let: { id: "$_id" }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$watchlistId", "$id"] }, { $eq: ["$workspaceKey", currentWorkspace()] }] } } }], as: "targets" } }, { $lookup: { from: "watch_check_runs", let: { id: "$_id" }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$watchlistId", "$$id"] }, { $eq: ["$workspaceKey", currentWorkspace()] }] } } }, { $sort: { createdAt: -1 } }, { $limit: 1 }, { $project: { status: 1 } }], as: "latest" } }, { $project: { watchlistId: { $toString: "$_id" }, name: 1, enabled: 1, lastCheckedAt: 1, targetCount: { $size: "$targets" }, latestRunStatus: { $ifNull: [{ $arrayElemAt: ["$latest.status", 0] }, null] } } }])
    ]);
    const byStatus = Object.fromEntries(list(statuses).map(row => [row._id, row.count]));
    const byWatchlist = new Map(list(changes).map(row => [String(row._id), row.count]));
    return { totalWatchlists: total, enabledWatchlists: enabled, disabledWatchlists: total - enabled, monitoredRepositories: list(monitored)[0]?.count ?? 0, successfulChecks: byStatus.completed ?? 0, partialChecks: byStatus.partially_complete ?? 0, failedChecks: byStatus.failed ?? 0, rateLimitedChecks: list(statuses).reduce((sum, row) => sum + (row.rateLimited ?? 0), 0), mostRecentRunAt: list(mostRecent)[0]?.value ?? null, watchlists: list(watchlists).map(row => ({ ...row, recentChangeCount: byWatchlist.get(String(row.watchlistId)) ?? 0 })) };
  }

  async changes(range: Range) {
    const match: any = { workspaceKey: currentWorkspace(), detectedAt: { $gte: range.from, $lte: range.to } };
    if (range.source) match.source = range.source;
    const m = this.models.ChangeEventModel;
    const [total, types, sources, days, repositories, watchlists] = await Promise.all([
      m.countDocuments(match), this.group(m, match, "$changeTypes", true), this.group(m, match, "$source"),
      m.aggregate([{ $match: match }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$detectedAt", timezone: "UTC" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      m.aggregate([{ $match: match }, { $group: { _id: "$savedId" } }, { $count: "count" }]), m.aggregate([{ $match: match }, { $group: { _id: "$watchlistId" } }, { $count: "count" }])
    ]);
    return { totalChanges: total, changesByType: list(types).map(row => ({ changeType: row._id, count: row.count })), changesBySource: list(sources).map(row => ({ source: row._id, count: row.count })), changesByDay: list(days).map(row => ({ date: row._id, count: row.count })), repositoriesWithChanges: list(repositories)[0]?.count ?? 0, watchlistsWithChanges: list(watchlists)[0]?.count ?? 0, from: range.from.toISOString(), to: range.to.toISOString() };
  }

  async searches(range: Range) {
    const match = { workspaceKey: currentWorkspace(), createdAt: { $gte: range.from, $lte: range.to } }, m = this.models.SearchJobModel;
    const [totalJobs, statuses, modes, average, sources, days] = await Promise.all([
      m.countDocuments(match), this.group(m, match, "$status"), this.group(m, match, "$request.collectionMode"),
      m.aggregate([{ $match: match }, { $group: { _id: null, value: { $avg: "$totalUnique" } } }]),
      m.aggregate([{ $match: match }, { $unwind: "$request.sources" }, { $group: { _id: "$request.sources", count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }]),
      m.aggregate([{ $match: match }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } }, searches: { $sum: 1 }, repositories: { $sum: "$totalUnique" } } }, { $sort: { _id: 1 } }])
    ]);
    return { totalJobs, jobsByStatus: list(statuses).map(row => ({ status: row._id, count: row.count })), jobsByCollectionMode: list(modes).map(row => ({ collectionMode: row._id, count: row.count })), averagePersistedResultCount: Number((list(average)[0]?.value ?? 0).toFixed(2)), sourceUsageCounts: list(sources).map(row => ({ source: row._id, count: row.count })), activity: list(days).map(row => ({ date: row._id, searches: row.searches, repositories: row.repositories })) };
  }

  private group(model: any, match: object, field: string, unwind = false) { return model.aggregate([{ $match: match }, ...(unwind ? [{ $unwind: field }] : []), { $group: { _id: field, count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }]); }
  private groupSaved(field: unknown) { return this.models.SavedRepositoryModel.aggregate([{ $match: { workspaceKey: currentWorkspace() } }, { $group: { _id: field, count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }]); }
  private withPercent(data: unknown, total: number, key: string, fallback = "") { return list(data).map(row => ({ [key]: row._id || fallback, count: row.count, percentage: percentage(row.count, total) })); }
  private distribution(items: unknown, field: string) { const counts = new Map<string, number>(); for (const item of list(items)) { const key = item[field] || "Unknown"; counts.set(key, (counts.get(key) ?? 0) + 1); } return [...counts].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)); }
}

export const analyticsService = new AnalyticsService();
