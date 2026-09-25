export interface ForgeOwner {
  id: number;
  login: string;
  full_name?: string;
  avatar_url?: string;
  html_url?: string;
}

export interface ForgeRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url?: string;
  owner: ForgeOwner;
  language?: string;
  stars_count: number;
  forks_count: number;
  watchers_count?: number;
  open_issues_count?: number;
  topics?: string[];
  default_branch?: string;
  created_at: string;
  updated_at: string;
  archived?: boolean;
  fork?: boolean;
  mirror?: boolean;
  private?: boolean;
  website?: string;
  size?: number;
  license?: string;
}

export interface ForgeSearchResponse {
  ok?: boolean;
  data: ForgeRepository[];
}
