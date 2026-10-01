import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { analyticsChanges, analyticsLanguages, analyticsSaved, analyticsSources, analyticsSummary, analyticsWatchlists } from "../services/api";

const sources = ["github", "gitlab", "codeberg", "gitea", "forgejo"];
function rangeDates(range: string) { const days = range === "365d" ? 365 : range === "90d" ? 90 : 30; const to = new Date(), from = new Date(to.getTime() - days * 86_400_000); return { from: from.toISOString(), to: to.toISOString() }; }

export function AnalyticsPage() {
  const [params, setParams] = useSearchParams();
  const range = ["30d", "90d", "365d"].includes(params.get("range") ?? "") ? params.get("range")! : "30d";
  const source = params.get("source") ?? "";
  const dates = rangeDates(range), ranged = { ...dates, source: source || undefined };
  const summary = useQuery({ queryKey: ["analytics", "summary", range], queryFn: () => analyticsSummary(dates), staleTime: 60_000, retry: false });
  const sourceData = useQuery({ queryKey: ["analytics", "sources"], queryFn: analyticsSources, staleTime: 60_000, retry: false });
  const languages = useQuery({ queryKey: ["analytics", "languages"], queryFn: () => analyticsLanguages(10), staleTime: 60_000, retry: false });
  const saved = useQuery({ queryKey: ["analytics", "saved"], queryFn: () => analyticsSaved(10), staleTime: 60_000, retry: false });
  const monitoring = useQuery({ queryKey: ["analytics", "watchlists", range], queryFn: () => analyticsWatchlists(dates), staleTime: 60_000, retry: false });
  const changes = useQuery({ queryKey: ["analytics", "changes", range, source], queryFn: () => analyticsChanges(ranged), staleTime: 60_000, retry: false });
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); value ? next.set(key, value) : next.delete(key); setParams(next); };
  return <section className="page analytics-page">
    <div className="page-heading"><div><span className="eyebrow">Persisted Atlas data</span><h1>Research analytics</h1><p>Descriptive metrics for the shared default workspace. Provider distributions describe this Atlas dataset, not provider market share.</p></div></div>
    <div className="analytics-filters" aria-label="Analytics filters"><label>Date range<select aria-label="Date range" value={range} onChange={event => update("range", event.target.value)}><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="365d">Last 365 days</option></select></label><label>Change source<select aria-label="Source" value={source} onChange={event => update("source", event.target.value)}><option value="">All sources</option>{sources.map(value => <option key={value}>{value}</option>)}</select></label></div>

    <AnalyticsSection title="Overview" query={summary}>{summary.data && <div className="stats-grid analytics-stats"><Metric label="Searches" value={summary.data.totalSearchJobs}/><Metric label="Collected repositories" value={summary.data.totalCollectedRepositories}/><Metric label="Saved repositories" value={summary.data.savedRepositories}/><Metric label="Collections" value={summary.data.collections}/><Metric label="Watchlists" value={summary.data.watchlists}/><Metric label="Recent changes" value={summary.data.recentChanges}/></div>}</AnalyticsSection>
    <div className="analytics-grid">
      <AnalyticsSection title="Repository sources" query={sourceData} empty={sourceData.data?.total === 0} emptyText="No repository results have been collected yet.">{sourceData.data && <Bars label="Atlas dataset source distribution" items={sourceData.data.sources.map(item => ({ label: item.source, count: item.count, percentage: item.percentage }))}/>}</AnalyticsSection>
      <AnalyticsSection title="Languages" query={languages} empty={languages.data?.total === 0} emptyText="No repository languages are available.">{languages.data && <Bars label="Top repository languages" items={languages.data.languages.map(item => ({ label: item.language, count: item.count, percentage: item.percentage }))}/>}</AnalyticsSection>
      <AnalyticsSection title="Monitoring activity" query={monitoring} empty={monitoring.data?.totalWatchlists === 0} emptyText="No watchlists are available.">{monitoring.data && <dl className="analytics-summary"><Data label="Successful checks" value={monitoring.data.successfulChecks}/><Data label="Partial checks" value={monitoring.data.partialChecks}/><Data label="Failed checks" value={monitoring.data.failedChecks}/><Data label="Rate-limited targets" value={monitoring.data.rateLimitedChecks}/><Data label="Monitored repositories" value={monitoring.data.monitoredRepositories}/></dl>}</AnalyticsSection>
      <AnalyticsSection title="Change timeline" query={changes} empty={changes.data?.totalChanges === 0} emptyText="No changes have been detected in this period.">{changes.data && <Bars label="Changes by day" items={changes.data.changesByDay.map(item => ({ label: item.date, count: item.count }))}/>}</AnalyticsSection>
      <AnalyticsSection title="Saved research" query={saved} empty={saved.data?.total === 0} emptyText="No saved repositories are available.">{saved.data && <><dl className="analytics-summary"><Data label="In collections" value={saved.data.repositoriesInCollections}/><Data label="In zero collections" value={saved.data.repositoriesInZeroCollections}/><Data label="Average collections" value={saved.data.averageCollectionsPerSavedRepository}/></dl><h3>Most-used tags</h3><ul className="plain-list">{saved.data.topTags.map(tag => <li key={tag.tag}><span>{tag.tag}</span><strong>{tag.count}</strong></li>)}</ul></>}</AnalyticsSection>
      <AnalyticsSection title="Changed fields" query={changes} empty={changes.data?.totalChanges === 0} emptyText="No changed fields are available for this period.">{changes.data && <Bars label="Changes by factual field" items={changes.data.changesByType.map(item => ({ label: item.changeType, count: item.count }))}/>}</AnalyticsSection>
    </div>
  </section>;
}

function AnalyticsSection({ title, query, children, empty = false, emptyText = "No data is available." }: { title:string; query:{isPending:boolean;isError:boolean;error:Error|null}; children:React.ReactNode;empty?:boolean;emptyText?:string }) { return <section className="analytics-section" aria-labelledby={`analytics-${title.replaceAll(" ", "-").toLowerCase()}`}><h2 id={`analytics-${title.replaceAll(" ", "-").toLowerCase()}`}>{title}</h2>{query.isPending && <p className="analytics-state">Loading {title.toLowerCase()}...</p>}{query.isError && <p className="notice error" role="alert">{query.error?.message ?? "Analytics are unavailable."}</p>}{!query.isPending && !query.isError && empty ? <p className="analytics-state">{emptyText}</p> : !query.isPending && !query.isError ? children : null}</section>; }
function Metric({label,value}:{label:string;value:number}) { return <article className="stat"><span>{label}</span><strong>{value}</strong><small>Persisted records</small></article>; }
function Data({label,value}:{label:string;value:number}) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function Bars({label,items}:{label:string;items:Array<{label:string;count:number;percentage?:number}>}) { const max=Math.max(1,...items.map(item=>item.count)); return <div className="bar-chart" role="img" aria-label={label}>{items.map(item=><div className="bar-row" key={item.label}><div><span>{item.label}</span><strong>{item.count}{item.percentage === undefined ? "" : ` (${item.percentage}%)`}</strong></div><div className="bar-track" aria-hidden="true"><span style={{width:`${item.count*100/max}%`}}/></div></div>)}</div>; }
