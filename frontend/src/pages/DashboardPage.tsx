import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { health, listConnectors } from "../services/api";

export function DashboardPage() {
  const healthQuery = useQuery({ queryKey: ["health"], queryFn: health });
  const connectors = useQuery({ queryKey: ["connectors"], queryFn: listConnectors });
  return (
    <section className="page">
      <div className="page-heading"><div><span className="eyebrow">Research command center</span><h1>Find signal across public sources.</h1><p>Search provider APIs, preserve provenance, and build research collections from real data.</p></div><Link className="button primary" to="/search">Start a search</Link></div>
      <div className="stats-grid">
        <Stat label="Active connectors" value={connectors.data?.length ?? "—"} detail="GitHub is the reference source" />
        <Stat label="API status" value={healthQuery.data?.status ?? "Checking"} detail={`Database: ${healthQuery.data?.database ?? "unknown"}`} />
        <Stat label="Saved items" value="0" detail="Research management arrives in M5" />
        <Stat label="Watchlists" value="0" detail="Monitoring arrives in M6" />
      </div>
      <div className="panel-grid">
        <article className="panel"><span className="eyebrow">Quick start</span><h2>Search GitHub repositories</h2><p>Try a focused query with language and star filters. Results come directly from GitHub and retain their source URL.</p><Link to="/search">Open universal search →</Link></article>
        <article className="panel"><span className="eyebrow">Access policy</span><h2>Designed for permitted collection</h2><p>Official APIs come first. Credentials stay server-side, requests are bounded, and connector failures remain visible.</p><Link to="/sources">Review source health →</Link></article>
      </div>
    </section>
  );
}

function Stat({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <article className="stat"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}
