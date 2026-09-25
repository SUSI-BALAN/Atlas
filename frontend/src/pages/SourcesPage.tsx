import { useQuery } from "@tanstack/react-query";
import { listConnectors } from "../services/api";
import type { ConnectorSummary } from "../types/api";

export function SourcesPage() {
  const query = useQuery({ queryKey: ["connectors"], queryFn: listConnectors, refetchInterval: 30_000 });
  return <section className="page"><div className="page-heading compact"><div><span className="eyebrow">Connector registry</span><h1>Sources</h1><p>Configuration, authentication, health, and capabilities are reported for every registered source.</p></div></div>{query.isPending && <div className="empty">Loading connector status...</div>}{query.isError && <div className="notice error" role="alert"><p>{query.error.message}</p><button className="button" onClick={() => void query.refetch()}>Retry source check</button></div>}{!query.isPending && !query.isError && query.data?.length === 0 && <div className="empty">No connectors are registered.</div>}<div className="source-grid">{query.data?.map((connector) => <SourceCard key={connector.id} connector={connector} />)}</div></section>;
}

function SourceCard({ connector }: { connector: ConnectorSummary }) {
  const health = connector.enabled ? connector.health.status : "disabled";
  return <article className={`source-card ${!connector.enabled ? "disabled-source" : ""}`}><div><span className="source-icon">{initials(connector.name)}</span>{health !== "limited" && <span className={`health ${health}`}>{health.replace("_", " ")}</span>}</div><h2>{connector.name}</h2><p>{connector.accessMethod}</p><dl>
    <Row label="Enabled" value={connector.enabled ? "Yes" : "No"} /><Row label="Authentication" value={connector.authentication === "token_configured" ? "Token configured" : "Anonymous"} />
    <Row label="Repository search" value={connector.capabilities.repositories && connector.enabled ? "Supported" : connector.capabilities.repositories ? "Disabled" : "Unsupported"} />
    <Row label="API latency" value={connector.health.latencyMs === null || connector.health.latencyMs === undefined ? "Not measured" : `${connector.health.latencyMs} ms`} />
    <Row label="Connector" value={connector.version} /><Row label="Last check" value={relativeTime(connector.health.lastCheckedAt ?? connector.health.lastSuccessfulRequestAt)} />
  </dl>{connector.health.message && <p className="source-message">{connector.health.message}</p>}<a className="source-link" href={connector.homepageUrl} target="_blank" rel="noreferrer">Explore source</a></article>;
}
function Row({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function initials(name: string): string { return name.split(/[.\s]+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function relativeTime(value: string | null | undefined): string { if (!value) return "Unknown"; const delta = new Date(value).getTime() - Date.now(); const minutes = Math.round(delta / 60_000); if (Math.abs(minutes) < 1) return "now"; if (minutes > 0) return `in ${minutes}m`; return `${Math.abs(minutes)}m ago`; }
