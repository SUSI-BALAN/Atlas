import type { ConnectorSummary, SearchRequest, SearchResponse } from "../types/api";

interface Envelope<T> { success: boolean; data: T; error?: { message: string } }

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers }
  });
  const payload = await response.json() as Envelope<T>;
  if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? `Request failed (${response.status})`);
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
