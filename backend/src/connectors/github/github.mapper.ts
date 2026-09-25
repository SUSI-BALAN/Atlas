import type { ConnectorContext, RawConnectorItem } from "../core/connector.types.js";
import { emptyMetrics, type NormalizedAuthor, type NormalizedItem, type SourceType } from "../../types/normalizedItem.js";
import type { GitHubCommit, GitHubIssue, GitHubRelease, GitHubRepository, GitHubUser } from "./github.types.js";

const CONNECTOR_VERSION = "0.1.0";

function idFor(type: SourceType, item: { id?: number; node_id?: string; sha?: string }): string {
  return item.node_id ?? item.sha ?? `${type}:${String(item.id)}`;
}

function author(owner: GitHubUser | null | undefined): NormalizedAuthor | null {
  if (!owner) return null;
  return {
    id: owner.node_id ?? String(owner.id),
    username: owner.login,
    displayName: owner.name ?? null,
    avatarUrl: owner.avatar_url,
    profileUrl: owner.html_url
  };
}

function base(
  type: SourceType,
  sourceId: string,
  title: string,
  description: string | null,
  url: string,
  context: ConnectorContext
): Pick<NormalizedItem, "id" | "source" | "sourceId" | "sourceType" | "title" | "description" | "url" | "collectedAt" | "rawDataReference" | "provenance"> {
  const collectedAt = new Date().toISOString();
  return {
    id: `github:${sourceId}`,
    source: "github",
    sourceId,
    sourceType: type,
    title,
    description,
    url,
    collectedAt,
    rawDataReference: null,
    provenance: {
      source: "github", sourceId, sourceUrl: url, connectorVersion: CONNECTOR_VERSION,
      requestId: context.requestId, jobId: context.jobId, collectedAt
    }
  };
}

export function mapRepository(item: GitHubRepository, context: ConnectorContext): NormalizedItem {
  const sourceId = idFor("repository", item);
  return {
    ...base("repository", sourceId, item.full_name, item.description, item.html_url, context),
    author: author(item.owner),
    metrics: emptyMetrics({ stars: item.stargazers_count, forks: item.forks_count, watchers: item.watchers_count, openIssues: item.open_issues_count }),
    tags: item.topics ?? [],
    language: item.language,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    publishedAt: null,
    metadata: {
      repositoryId: item.id, name: item.name, ownerType: item.owner.type ?? null, cloneUrl: item.clone_url ?? null,
      license: item.license?.spdx_id ?? item.license?.name ?? null,
      defaultBranch: item.default_branch, pushedAt: item.pushed_at, archived: item.archived,
      fork: item.fork, visibility: item.visibility ?? null, homepage: item.homepage, sizeKb: item.size
    }
  };
}

export function mapUser(item: GitHubUser, context: ConnectorContext): NormalizedItem {
  const type: SourceType = item.type === "Organization" ? "organization" : "user";
  const sourceId = idFor(type, item);
  return {
    ...base(type, sourceId, item.name ?? item.login, item.bio ?? null, item.html_url, context),
    author: author(item),
    metrics: emptyMetrics(),
    tags: [], language: null,
    createdAt: item.created_at ?? null, updatedAt: item.updated_at ?? null, publishedAt: null,
    metadata: {
      userId: item.id, accountType: item.type ?? null, company: item.company ?? null,
      blog: item.blog ?? null, location: item.location ?? null, publicRepositories: item.public_repos ?? null,
      followers: item.followers ?? null, following: item.following ?? null
    }
  };
}

export function mapIssue(item: GitHubIssue, context: ConnectorContext, forcedType?: "issue" | "pull_request"): NormalizedItem {
  const type: "issue" | "pull_request" = forcedType ?? (item.pull_request ? "pull_request" : "issue");
  const sourceId = idFor(type, item);
  const labels = item.labels.map((label) => typeof label === "string" ? label : label.name).filter((value): value is string => Boolean(value));
  return {
    ...base(type, sourceId, item.title, item.body ?? null, item.html_url, context),
    author: author(item.user),
    metrics: emptyMetrics({ comments: item.comments }),
    tags: labels, language: null, createdAt: item.created_at, updatedAt: item.updated_at, publishedAt: null,
    metadata: {
      issueId: item.id, number: item.number, state: item.state, closedAt: item.closed_at,
      assignees: (item.assignees ?? []).map((entry) => entry.login), repositoryUrl: item.repository_url ?? null,
      draft: item.draft ?? null, merged: item.merged ?? null, baseBranch: item.base?.ref ?? null, headBranch: item.head?.ref ?? null
    }
  };
}

export function mapRelease(item: GitHubRelease, context: ConnectorContext): NormalizedItem {
  const sourceId = idFor("release", item);
  return {
    ...base("release", sourceId, item.name ?? item.tag_name, item.body, item.html_url, context),
    author: author(item.author), metrics: emptyMetrics(), tags: [item.tag_name], language: null,
    createdAt: item.created_at, updatedAt: null, publishedAt: item.published_at,
    metadata: { releaseId: item.id, tag: item.tag_name, draft: item.draft, prerelease: item.prerelease }
  };
}

export function mapCommit(item: GitHubCommit, context: ConnectorContext): NormalizedItem {
  const title = item.commit.message.split("\n")[0] || item.sha;
  return {
    ...base("commit", idFor("commit", item), title, item.commit.message, item.html_url, context),
    author: author(item.author), metrics: emptyMetrics(), tags: [], language: null,
    createdAt: item.commit.author?.date ?? null, updatedAt: item.commit.committer?.date ?? null, publishedAt: null,
    metadata: { sha: item.sha, authorName: item.commit.author?.name ?? null }
  };
}

export function rawItem(item: NormalizedItem, data: unknown): RawConnectorItem {
  return { sourceId: item.sourceId, sourceType: item.sourceType, sourceUrl: item.url, data };
}
