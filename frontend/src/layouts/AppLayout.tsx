import { NavLink, Outlet } from "react-router-dom";

const navigation = [
  ["/", "Overview"], ["/search", "Universal search"], ["/sources", "Sources"],
  ["/saved", "Saved"], ["/collections", "Collections"], ["/watchlists", "Watchlists"],
  ["/changes", "Changes"], ["/analytics", "Analytics"], ["/ai", "AI research"], ["/settings", "Settings"]
] as const;

export function AppLayout() {
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
          <div className="top-status"><span className="status-dot" />GitHub enabled</div>
        </header>
        <main><Outlet /></main>
      </div>
    </div>
  );
}
