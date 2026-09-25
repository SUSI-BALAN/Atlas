export interface GitLabNamespace {
  id: number;
  name: string;
  full_path: string;
  kind?: string;
  avatar_url?: string | null;
  web_url?: string;
}

export interface GitLabProject {
  id: number;
  name: string;
  name_with_namespace: string;
  path_with_namespace: string;
  description: string | null;
  web_url: string;
  http_url_to_repo?: string;
  avatar_url?: string | null;
  forks_count: number;
  star_count: number;
  open_issues_count?: number;
  created_at: string;
  updated_at?: string;
  last_activity_at: string;
  topics?: string[];
  tag_list?: string[];
  default_branch?: string | null;
  archived?: boolean;
  visibility?: string;
  namespace: GitLabNamespace;
  readme_url?: string | null;
  web_url_to_repo?: string;
}
