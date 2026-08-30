export interface GitHubOwner {
  id: number;
  node_id?: string;
  login: string;
  avatar_url: string;
  html_url: string;
  type?: string;
}

export interface GitHubRepository {
  id: number;
  node_id?: string;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  owner: GitHubOwner;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  topics?: string[];
  license?: { key?: string; name?: string; spdx_id?: string | null } | null;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
  archived: boolean;
  fork: boolean;
  visibility?: string;
  homepage: string | null;
  size: number;
}

export interface GitHubUser extends GitHubOwner {
  name?: string | null;
  bio?: string | null;
  company?: string | null;
  blog?: string;
  location?: string | null;
  public_repos?: number;
  followers?: number;
  following?: number;
  created_at?: string;
  updated_at?: string;
}

export interface GitHubIssue {
  id: number;
  node_id?: string;
  number: number;
  title: string;
  body?: string | null;
  state: string;
  html_url: string;
  user: GitHubOwner | null;
  labels: Array<string | { name?: string | null }>;
  assignees?: GitHubOwner[];
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  comments: number;
  repository_url?: string;
  pull_request?: Record<string, unknown>;
  draft?: boolean;
  merged?: boolean;
  base?: { ref?: string };
  head?: { ref?: string };
}

export interface GitHubRelease {
  id: number;
  node_id?: string;
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  author: GitHubOwner;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string | null;
}

export interface GitHubCommit {
  node_id?: string;
  sha: string;
  html_url: string;
  author: GitHubOwner | null;
  commit: {
    message: string;
    author: { name: string | null; email?: string | null; date: string | null } | null;
    committer?: { date: string | null } | null;
  };
}

export interface GitHubSearchResponse<T> {
  total_count: number;
  incomplete_results: boolean;
  items: T[];
}
