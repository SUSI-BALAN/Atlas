import type { AnalyticsLanguages, AnalyticsSources, AnalyticsSummary, ChangeAnalytics, ChangeEvent, Collection, ConnectorSummary, NormalizedRepository, RepositoryResultPage, RepositorySearchJobRequest, RepositorySource, SavedAnalytics, SavedPage, SavedRepository, SearchJob, SearchJobHistoryPage, SearchRequest, SearchResponse, WatchedRepository, Watchlist, WatchlistAnalytics, WatchRun } from "../types/api";

interface Envelope<T> { success: boolean; data: T; error?: { message: string; details?: unknown }; meta?: { requestId?: string } }

const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim();

export function buildApiUrl(path: string, baseUrl = configuredApiBaseUrl): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!baseUrl.trim()) return normalizedPath;
  const base = new URL(baseUrl);
  if (base.username || base.password || base.search || base.hash) throw new Error("VITE_API_BASE_URL must be a clean HTTP(S) origin or base path");
  if (!/^https?:$/.test(base.protocol)) throw new Error("VITE_API_BASE_URL must use HTTP or HTTPS");
  const prefix = base.pathname.replace(/\/+$/, "");
  return `${base.origin}${prefix}${normalizedPath}`;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers }
  });
  const body = await response.text();
  let payload: Envelope<T> | null = null;
  if (body.trim()) {
    try {
      payload = JSON.parse(body) as Envelope<T>;
    } catch {
      throw new Error(response.ok ? "API returned an invalid response" : `API unavailable (${response.status})`);
    }
  }
  if (!payload) throw new Error(response.ok ? "API returned an empty response" : `API unavailable (${response.status})`);
  if (!response.ok || !payload.success) {
    const message = payload.error?.message ?? `Request failed (${response.status})`;
    const requestId = payload.meta?.requestId;
    throw new Error(requestId ? `${message} (request ${requestId})` : message);
  }
  return payload.data;
}

export function search(request: SearchRequest): Promise<SearchResponse> {
  return api<SearchResponse>("/api/search", { method: "POST", body: JSON.stringify(request) });
}

export function listConnectors(): Promise<ConnectorSummary[]> {
  return api<ConnectorSummary[]>("/api/connectors");
}

export function health(): Promise<{ status: string; database: string }> {
  return api("/api/health");
}

export function createSearchJob(request: RepositorySearchJobRequest): Promise<SearchJob> { return api("/api/search/jobs", { method: "POST", body: JSON.stringify(request) }); }
export function listSearchJobs(cursor?: string, limit = 20): Promise<SearchJobHistoryPage> { const query = new URLSearchParams({ limit: String(limit) }); if (cursor) query.set("cursor", cursor); return api(`/api/search/jobs?${query}`); }
export function getSearchJob(jobId: string): Promise<SearchJob> { return api(`/api/search/jobs/${jobId}`); }
export function getSearchJobResults(jobId: string, cursor?: string, limit = 50): Promise<RepositoryResultPage> { const query = new URLSearchParams({ limit: String(limit) }); if (cursor) query.set("cursor", cursor); return api(`/api/search/jobs/${jobId}/results?${query}`); }
export function getRepositoryResult(jobId: string, repositoryId: string): Promise<NormalizedRepository> { return api(`/api/search/jobs/${jobId}/repositories/${repositoryId}`); }
export function cancelSearchJob(jobId: string): Promise<SearchJob> { return api(`/api/search/jobs/${jobId}/cancel`, { method: "POST" }); }
export function retrySearchSource(jobId: string, source: RepositorySource): Promise<SearchJob> { return api(`/api/search/jobs/${jobId}/sources/${source}/retry`, { method: "POST" }); }
export function searchExportUrl(jobId: string, format: "json" | "csv"): string { return buildApiUrl(`/api/search/jobs/${jobId}/export?format=${format}`); }
export function saveRepository(jobId:string,repositoryId:string):Promise<SavedRepository>{return api("/api/saved",{method:"POST",body:JSON.stringify({jobId,repositoryId})});}
export function lookupSaved(source:RepositorySource,externalId:string):Promise<SavedRepository|null>{return api(`/api/saved/lookup?${new URLSearchParams({source,externalId})}`);}
export function listSaved(params:Record<string,string|undefined>={}):Promise<SavedPage>{const query=new URLSearchParams();for(const [key,value] of Object.entries(params))if(value)query.set(key,value);return api(`/api/saved?${query}`);}
export function getSaved(id:string):Promise<SavedRepository>{return api(`/api/saved/${id}`);}
export function updateSaved(id:string,patch:{note?:string;tags?:string[]}):Promise<SavedRepository>{return api(`/api/saved/${id}`,{method:"PATCH",body:JSON.stringify(patch)});}
export function unsaveRepository(id:string):Promise<{deleted:boolean}>{return api(`/api/saved/${id}`,{method:"DELETE"});}
export function workspaceSummary():Promise<{savedRepositories:number;collections:number;watchlists:number;recentChanges:number}>{return api("/api/saved/summary");}
export function listCollections():Promise<Collection[]>{return api("/api/collections");}
export function createCollection(input:{name:string;description:string}):Promise<Collection>{return api("/api/collections",{method:"POST",body:JSON.stringify(input)});}
export function getCollection(id:string):Promise<Collection>{return api(`/api/collections/${id}`);}
export function updateCollection(id:string,patch:{name?:string;description?:string}):Promise<Collection>{return api(`/api/collections/${id}`,{method:"PATCH",body:JSON.stringify(patch)});}
export function deleteCollection(id:string):Promise<{deleted:boolean}>{return api(`/api/collections/${id}`,{method:"DELETE"});}
export function listCollectionRepositories(id:string,cursor?:string):Promise<SavedPage>{const query=new URLSearchParams({limit:"20"});if(cursor)query.set("cursor",cursor);return api(`/api/collections/${id}/repositories?${query}`);}
export function addToCollection(collectionId:string,savedId:string):Promise<Collection>{return api(`/api/collections/${collectionId}/repositories/${savedId}`,{method:"POST"});}
export function removeFromCollection(collectionId:string,savedId:string):Promise<{deleted:boolean}>{return api(`/api/collections/${collectionId}/repositories/${savedId}`,{method:"DELETE"});}
export function listWatchlists(cursor?:string):Promise<{watchlists:Watchlist[];nextCursor:string|null;hasMore:boolean}>{const q=new URLSearchParams({limit:"20"});if(cursor)q.set("cursor",cursor);return api(`/api/watchlists?${q}`)}
export function createWatchlist(input:{name:string;description:string;enabled:boolean;checkIntervalMinutes:number}):Promise<Watchlist>{return api("/api/watchlists",{method:"POST",body:JSON.stringify(input)})}
export function getWatchlist(id:string):Promise<Watchlist>{return api(`/api/watchlists/${id}`)}
export function updateWatchlist(id:string,patch:Partial<Pick<Watchlist,"name"|"description"|"enabled"|"checkIntervalMinutes">>):Promise<Watchlist>{return api(`/api/watchlists/${id}`,{method:"PATCH",body:JSON.stringify(patch)})}
export function deleteWatchlist(id:string):Promise<{deleted:boolean}>{return api(`/api/watchlists/${id}`,{method:"DELETE"})}
export function listWatchedRepositories(id:string):Promise<{repositories:WatchedRepository[];nextCursor:string|null;hasMore:boolean}>{return api(`/api/watchlists/${id}/repositories?limit=100`)}
export function addToWatchlist(id:string,savedId:string){return api(`/api/watchlists/${id}/repositories/${savedId}`,{method:"POST"})}
export function removeFromWatchlist(id:string,savedId:string):Promise<{deleted:boolean}>{return api(`/api/watchlists/${id}/repositories/${savedId}`,{method:"DELETE"})}
export function checkWatchlist(id:string):Promise<WatchRun>{return api(`/api/watchlists/${id}/check`,{method:"POST"})}
export function listWatchRuns(id:string):Promise<{runs:WatchRun[];nextCursor:string|null;hasMore:boolean}>{return api(`/api/watchlists/${id}/runs?limit=20`)}
export function listChanges(params:Record<string,string|undefined>={}):Promise<{changes:ChangeEvent[];nextCursor:string|null;hasMore:boolean}>{const q=new URLSearchParams({limit:"20"});for(const[k,v]of Object.entries(params))if(v)q.set(k,v);return api(`/api/changes?${q}`)}
const analyticsQuery=(params:Record<string,string|undefined>)=>{const q=new URLSearchParams();for(const[k,v]of Object.entries(params))if(v)q.set(k,v);return q.toString()?`?${q}`:""};
export function analyticsSummary(params:Record<string,string|undefined>):Promise<AnalyticsSummary>{return api(`/api/analytics/summary${analyticsQuery(params)}`)}
export function analyticsSources():Promise<AnalyticsSources>{return api("/api/analytics/sources")}
export function analyticsLanguages(limit=10):Promise<AnalyticsLanguages>{return api(`/api/analytics/languages?limit=${limit}`)}
export function analyticsSaved(limit=10):Promise<SavedAnalytics>{return api(`/api/analytics/saved?limit=${limit}`)}
export function analyticsWatchlists(params:Record<string,string|undefined>):Promise<WatchlistAnalytics>{return api(`/api/analytics/watchlists${analyticsQuery(params)}`)}
export function analyticsChanges(params:Record<string,string|undefined>):Promise<ChangeAnalytics>{return api(`/api/analytics/changes${analyticsQuery(params)}`)}
