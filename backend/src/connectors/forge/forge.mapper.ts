import { emptyMetrics, type NormalizedItem } from "../../types/normalizedItem.js";
import type { ConnectorContext, RawConnectorItem } from "../core/connector.types.js";
import type { ForgeRepository } from "./forge.types.js";

export function mapForgeRepository(item: ForgeRepository, source: string, connectorVersion: string, context: ConnectorContext): NormalizedItem {
  const sourceId = String(item.id);
  const collectedAt = new Date().toISOString();
  const url = item.html_url;
  return {
    id: `${source}:${sourceId}`,
    source,
    sourceId,
    sourceType: "repository",
    title: item.full_name,
    description: item.description,
    url,
    author: {
      id: String(item.owner.id),
      username: item.owner.login,
      displayName: item.owner.full_name || null,
      avatarUrl: item.owner.avatar_url || null,
      profileUrl: item.owner.html_url || null
    },
    metrics: emptyMetrics({
      stars: item.stars_count,
      forks: item.forks_count,
      watchers: item.watchers_count ?? null,
      openIssues: item.open_issues_count ?? null
    }),
    tags: item.topics ?? [],
    language: item.language || null,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    publishedAt: null,
    collectedAt,
    rawDataReference: null,
    provenance: { source, sourceId, sourceUrl: url, connectorVersion, requestId: context.requestId, jobId: context.jobId, collectedAt },
    metadata: {
      repositoryId: item.id, cloneUrl: item.clone_url ?? null,
      name: item.name,
      defaultBranch: item.default_branch ?? null,
      archived: item.archived ?? null,
      fork: item.fork ?? null,
      mirror: item.mirror ?? null,
      visibility: item.private === undefined ? null : item.private ? "private" : "public",
      homepage: item.website || null,
      sizeKb: item.size ?? null,
      license: item.license || null
    }
  };
}

export function forgeRawItem(item: NormalizedItem, data: unknown): RawConnectorItem {
  return { sourceId: item.sourceId, sourceType: item.sourceType, sourceUrl: item.url, data };
}
