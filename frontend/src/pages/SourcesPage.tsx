import { useQuery } from "@tanstack/react-query";
import { listConnectors } from "../services/api";

export function SourcesPage() {
  const query = useQuery({ queryKey: ["connectors"], queryFn: listConnectors });
  return <section className="page"><div className="page-heading compact"><div><span className="eyebrow">Connector registry</span><h1>Sources</h1><p>Capabilities and provider limits are reported by each connector.</p></div></div>{query.isPending && <div className="empty">Loading connector status…</div>}{query.isError && <div className="notice error">{query.error.message}</div>}<div className="source-grid">{query.data?.map((connector) => <article className="source-card" key={connector.id}><div><span className="source-icon">GH</span><span className={`health ${connector.health.status}`}>{connector.health.status.replace("_", " ")}</span></div><h2>{connector.name}</h2><p>Official GitHub REST API · connector {connector.version}</p><dl><div><dt>Remaining</dt><dd>{connector.rateLimit.remaining ?? "Unknown"}</dd></div><div><dt>Limit</dt><dd>{connector.rateLimit.limit ?? "Unknown"}</dd></div><div><dt>Search</dt><dd>{connector.capabilities.search ? "Enabled" : "Disabled"}</dd></div></dl></article>)}</div></section>;
}
