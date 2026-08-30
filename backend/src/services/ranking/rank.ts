import type { NormalizedItem } from "../../types/normalizedItem.js";
import type { SearchQuery } from "../../types/search.js";

export function rankItems(items: NormalizedItem[], query: SearchQuery): NormalizedItem[] {
  const scored = items.map((item) => ({ item, score: relevanceScore(item, query.query) }));
  scored.sort((a, b) => compare(a, b, query));
  return scored.map(({ item }) => item);
}

function compare(a: { item: NormalizedItem; score: number }, b: { item: NormalizedItem; score: number }, query: SearchQuery): number {
  const direction = query.sort === "oldest" ? 1 : -1;
  if (query.sort === "newest") return direction * compareDates(a.item.createdAt, b.item.createdAt);
  if (query.sort === "oldest") return direction * compareDates(a.item.createdAt, b.item.createdAt);
  if (query.sort === "recently_updated") return -compareDates(a.item.updatedAt, b.item.updatedAt);
  if (query.sort === "most_starred") return (b.item.metrics.stars ?? -1) - (a.item.metrics.stars ?? -1);
  if (query.sort === "most_forked") return (b.item.metrics.forks ?? -1) - (a.item.metrics.forks ?? -1);
  if (query.sort === "most_discussed") return (b.item.metrics.comments ?? -1) - (a.item.metrics.comments ?? -1);
  if (query.sort === "source") return a.item.source.localeCompare(b.item.source) || b.score - a.score;
  return b.score - a.score;
}

function relevanceScore(item: NormalizedItem, query: string): number {
  const terms = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const title = item.title.toLocaleLowerCase();
  const description = item.description?.toLocaleLowerCase() ?? "";
  let score = title.includes(query.toLocaleLowerCase()) ? 10 : 0;
  for (const term of terms) {
    if (title.includes(term)) score += 3;
    if (description.includes(term)) score += 1;
    if (item.tags.some((tag) => tag.toLocaleLowerCase().includes(term))) score += 2;
  }
  if (item.source === "github" && item.sourceType === "repository") {
    score += Math.log10((item.metrics.stars ?? 0) + 1);
  }
  const changedAt = item.updatedAt ?? item.publishedAt ?? item.createdAt;
  if (changedAt) {
    const ageDays = Math.max(0, (Date.now() - Date.parse(changedAt)) / 86_400_000);
    score += Math.max(0, 1 - ageDays / 3650);
  }
  return score;
}

function compareDates(a: string | null, b: string | null): number {
  return (a ? Date.parse(a) : 0) - (b ? Date.parse(b) : 0);
}
