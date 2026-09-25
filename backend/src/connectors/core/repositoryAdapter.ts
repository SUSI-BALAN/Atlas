import type { NormalizedItem } from "../../types/normalizedItem.js";
import type { NormalizedRepository, RepositorySource } from "../../types/repositorySearch.js";

export function normalizedItemToRepository(item: NormalizedItem): NormalizedRepository {
  const metadata = item.metadata;
  const name = stringValue(metadata.name) ?? item.title.split(/[\/]/).at(-1) ?? item.title;
  const owner = item.author?.username ?? item.title.split(/[\/]/)[0] ?? "unknown";
  return {
    id: `${item.source}:${item.sourceId}`,
    source: item.source as RepositorySource,
    externalId: item.sourceId,
    owner,
    name,
    fullName: item.title,
    description: item.description,
    repositoryUrl: item.url,
    cloneUrl: stringValue(metadata.cloneUrl),
    defaultBranch: stringValue(metadata.defaultBranch),
    language: item.language,
    languages: Array.isArray(metadata.languages) ? metadata.languages.filter((value): value is string => typeof value === "string") : item.language ? [item.language] : [],
    topics: item.tags,
    stars: item.metrics.stars ?? 0,
    forks: item.metrics.forks ?? 0,
    watchers: item.metrics.watchers,
    openIssues: item.metrics.openIssues,
    license: stringValue(metadata.license),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    pushedAt: stringValue(metadata.pushedAt),
    archived: booleanValue(metadata.archived),
    fork: booleanValue(metadata.fork),
    visibility: stringValue(metadata.visibility),
    sourceMetadata: { ...metadata, provenance: item.provenance }
  };
}

function stringValue(value: unknown): string | null { return typeof value === "string" && value.length > 0 ? value : null; }
function booleanValue(value: unknown): boolean { return value === true; }
