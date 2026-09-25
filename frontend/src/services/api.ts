import type { ConnectorSummary, RepositoryResultPage, RepositorySearchJobRequest, RepositorySource, SearchJob, SearchRequest, SearchResponse } from "../types/api";

interface Envelope<T> { success: boolean; data: T; error?: { message: string; details?: unknown }; meta?: { requestId?: string } }

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
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
export function getSearchJob(jobId: string): Promise<SearchJob> { return api(`/api/search/jobs/${jobId}`); }
export function getSearchJobResults(jobId: string, cursor?: string, limit = 50): Promise<RepositoryResultPage> { const query = new URLSearchParams({ limit: String(limit) }); if (cursor) query.set("cursor", cursor); return api(`/api/search/jobs/${jobId}/results?${query}`); }
export function cancelSearchJob(jobId: string): Promise<SearchJob> { return api(`/api/search/jobs/${jobId}/cancel`, { method: "POST" }); }
export function retrySearchSource(jobId: string, source: RepositorySource): Promise<SearchJob> { return api(`/api/search/jobs/${jobId}/sources/${source}/retry`, { method: "POST" }); }
export function searchExportUrl(jobId: string, format: "json" | "csv"): string { return `/api/search/jobs/${jobId}/export?format=${format}`; }
