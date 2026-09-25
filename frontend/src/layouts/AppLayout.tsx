import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet } from "react-router-dom";
import { listConnectors } from "../services/api";

const navigation = [
  ["/", "Overview"], ["/search", "Universal search"], ["/sources", "Sources"],
  ["/saved", "Saved"], ["/collections", "Collections"], ["/watchlists", "Watchlists"],
  ["/changes", "Changes"], ["/analytics", "Analytics"], ["/ai", "AI research"], ["/settings", "Settings"]
] as const;

export function AppLayout() {
  const connectors = useQuery({ queryKey: ["connectors"], queryFn: listConnectors });
  const available = connectors.data?.filter((connector) => connector.enabled && connector.health.status === "healthy").length ?? 0;
  const connectorCount = connectors.data?.length ?? 0;
  const degraded = connectorCount > 0 && available < connectorCount;
  const sourceStatus = connectors.isPending ? "Checking sources" : connectors.isError ? "Sources unavailable" : connectorCount === 0 ? "No sources configured" : `${available}/${connectorCount} sources available`;
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">A</span><div><strong>Atlas</strong><small>Research collector</small></div></div>
        <nav aria-label="Primary navigation">
          {navigation.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => isActive ? "active" : ""}>{label}</NavLink>
          ))}
        </nav>
        <div className="policy-note"><span className="status-dot" />Public & authorized data only</div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div><span className="eyebrow">Workspace</span><strong>Personal research</strong></div>
          <div className="top-status"><span className={`status-dot ${degraded || connectors.isError ? "degraded" : ""}`} />{sourceStatus}</div>
        </header>
        <main><Outlet /></main>
      </div>
    </div>
  );
}
