import { emptyMetrics, type NormalizedItem } from "../../types/normalizedItem.js";
import type { ConnectorContext, RawConnectorItem } from "../core/connector.types.js";
import type { GitLabProject } from "./gitlab.types.js";

export function mapGitLabProject(project: GitLabProject, version: string, context: ConnectorContext): NormalizedItem {
  const sourceId = String(project.id);
  const collectedAt = new Date().toISOString();
  return {
    id: `gitlab:${sourceId}`, source: "gitlab", sourceId, sourceType: "repository",
    title: project.name_with_namespace, description: project.description, url: project.web_url,
    author: {
      id: String(project.namespace.id), username: project.namespace.full_path, displayName: project.namespace.name,
      avatarUrl: absoluteProviderUrl(project.namespace.avatar_url, project.web_url), profileUrl: project.namespace.web_url ?? null
    },
    metrics: emptyMetrics({ stars: project.star_count, forks: project.forks_count, openIssues: project.open_issues_count ?? null }),
    tags: project.topics ?? project.tag_list ?? [], language: null,
    createdAt: project.created_at, updatedAt: project.updated_at ?? project.last_activity_at, publishedAt: null,
    collectedAt, rawDataReference: null,
    provenance: { source: "gitlab", sourceId, sourceUrl: project.web_url, connectorVersion: version, requestId: context.requestId, jobId: context.jobId, collectedAt },
    metadata: {
      projectId: project.id, pathWithNamespace: project.path_with_namespace, namespaceKind: project.namespace.kind ?? null, cloneUrl: project.http_url_to_repo ?? null,
      defaultBranch: project.default_branch ?? null, lastActivityAt: project.last_activity_at, archived: project.archived ?? null,
      visibility: project.visibility ?? null, readmeUrl: project.readme_url ?? null
    }
  };
}

export function gitLabRawItem(item: NormalizedItem, data: unknown): RawConnectorItem {
  return { sourceId: item.sourceId, sourceType: item.sourceType, sourceUrl: item.url, data };
}

function absoluteProviderUrl(value: string | null | undefined, projectUrl: string): string | null {
  if (!value) return null;
  try { return new URL(value, projectUrl).toString(); } catch { return null; }
}
