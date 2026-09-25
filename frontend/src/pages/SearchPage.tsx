import { useMutation, useQuery } from "@tanstack/react-query";
import { type FormEvent, useMemo, useState } from "react";
import { cancelSearchJob, createSearchJob, getSearchJob, getSearchJobResults, listConnectors, retrySearchSource, searchExportUrl } from "../services/api";
import type { NormalizedRepository, RepositorySearchJobRequest, RepositorySource, SearchJob } from "../types/api";

const terminal = new Set<SearchJob["status"]>(["completed", "partially_complete", "cancelled", "failed"]);

export function SearchPage() {
  const connectors = useQuery({ queryKey: ["connectors"], queryFn: listConnectors });
  const enabledSources = useMemo(() => (connectors.data ?? []).filter((connector) => connector.enabled && connector.capabilities.repositories).map((connector) => connector.id as RepositorySource), [connectors.data]);
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState<RepositorySource[] | null>(null);
  const [mode, setMode] = useState<RepositorySearchJobRequest["collectionMode"]>("preview");
  const [language, setLanguage] = useState(""); const [topics, setTopics] = useState(""); const [license, setLicense] = useState("");
  const [starsMin, setStarsMin] = useState(""); const [archived, setArchived] = useState<"all" | "active" | "archived">("all");
  const [sortField, setSortField] = useState<RepositorySearchJobRequest["sort"]["field"]>("relevance");
  const [jobId, setJobId] = useState<string | null>(null);
  const [pageCursor, setPageCursor] = useState<string | undefined>(); const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([]);

  const selected = (sources ?? enabledSources).filter((source) => enabledSources.includes(source));
  const createMutation = useMutation({ mutationFn: createSearchJob, onSuccess: (job) => { setJobId(job.jobId); setPageCursor(undefined); setCursorHistory([]); } });
  const jobQuery = useQuery({ queryKey: ["search-job", jobId], queryFn: () => getSearchJob(jobId!), enabled: Boolean(jobId), refetchInterval: (state) => state.state.data && terminal.has(state.state.data.status) ? false : 1000 });
  const resultQuery = useQuery({ queryKey: ["search-job-results", jobId, pageCursor, jobQuery.data?.totalUnique], queryFn: () => getSearchJobResults(jobId!, pageCursor, 50), enabled: Boolean(jobId) && (jobQuery.data?.totalUnique ?? 0) > 0, placeholderData: (previous) => previous });
  const cancelMutation = useMutation({ mutationFn: () => cancelSearchJob(jobId!), onSuccess: () => void jobQuery.refetch() });
  const retryMutation = useMutation({ mutationFn: (source: RepositorySource) => retrySearchSource(jobId!, source), onSuccess: () => void jobQuery.refetch() });

  function submit(event: FormEvent) {
    event.preventDefault();
    const request: RepositorySearchJobRequest = {
      query, sources: selected,
      filters: {
        ...(language.trim() ? { language: splitList(language) } : {}), ...(topics.trim() ? { topic: splitList(topics) } : {}),
        ...(license.trim() ? { license: splitList(license) } : {}), ...(starsMin ? { starsMin: Number(starsMin) } : {}),
        ...(archived !== "all" ? { archived: archived === "archived" } : {})
      },
      sort: { field: sortField, direction: "desc" }, collectionMode: mode, resultLimit: mode === "preview" ? 50 : mode === "expanded" ? 500 : null
    };
    createMutation.mutate(request);
  }

  function toggleSource(source: RepositorySource) { setSources((current) => { const values = current ?? enabledSources; return values.includes(source) ? values.filter((item) => item !== source) : [...values, source]; }); }
  const job = jobQuery.data;
  const results = resultQuery.data?.results ?? [];

  return <section className="page">
    <div className="page-heading compact"><div><span className="eyebrow">Universal repository research</span><h1>Collect all available results.</h1><p>Atlas processes provider pages in bounded batches, persists normalized repositories, and exposes partial results while collection continues.</p></div></div>
    <form className="search-panel" onSubmit={submit}>
      <label className="query-field"><span>Research query</span><input value={query} onChange={(event) => setQuery(event.target.value)} required maxLength={256} placeholder="e.g. AI coding agent" /></label>
      <fieldset className="source-picker"><legend>Sources</legend>{(connectors.data ?? []).map((connector) => <label key={connector.id} className={!connector.enabled ? "disabled" : ""}><input type="checkbox" disabled={!connector.enabled} checked={selected.includes(connector.id as RepositorySource)} onChange={() => toggleSource(connector.id as RepositorySource)} /><span>{connector.name}{!connector.enabled ? " (disabled)" : ""}</span></label>)}</fieldset>
      <div className="selection-actions"><button type="button" onClick={() => setSources(enabledSources)}>Select all enabled</button><button type="button" onClick={() => setSources([])}>Clear all</button></div>
      <div className="filters-row job-filters">
        <label><span>Search mode</span><select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="preview">Fast · 50</option><option value="expanded">Deep · 500</option><option value="all">All available results</option></select></label>
        <label><span>Language</span><input value={language} onChange={(event) => setLanguage(event.target.value)} placeholder="TypeScript, Go" /></label>
        <label><span>Topics</span><input value={topics} onChange={(event) => setTopics(event.target.value)} placeholder="agents, llm" /></label>
        <label><span>Minimum stars</span><input type="number" min="0" value={starsMin} onChange={(event) => setStarsMin(event.target.value)} placeholder="0" /></label>
        <label><span>License</span><input value={license} onChange={(event) => setLicense(event.target.value)} placeholder="MIT, Apache-2.0" /></label>
        <label><span>Archived</span><select value={archived} onChange={(event) => setArchived(event.target.value as typeof archived)}><option value="all">Any</option><option value="active">Active only</option><option value="archived">Archived only</option></select></label>
        <label><span>Sort</span><select value={sortField} onChange={(event) => setSortField(event.target.value as typeof sortField)}><option value="relevance">Relevance</option><option value="stars">Stars</option><option value="updated">Updated</option><option value="created">Created</option></select></label>
        <button className="button primary" disabled={createMutation.isPending || selected.length === 0}>{createMutation.isPending ? "Creating job..." : "Start research"}</button>
      </div>
      {mode === "all" && <div className="notice info">This search continues through available API pages and may take longer. Results are collected progressively and remain subject to each provider's API limits. MongoDB is required.</div>}
    </form>
    {(createMutation.isError || jobQuery.isError) && <div className="notice error" role="alert">{createMutation.error?.message ?? jobQuery.error?.message}</div>}
    {job && <JobProgress job={job} onCancel={() => cancelMutation.mutate()} onRetry={(source) => retryMutation.mutate(source)} />}
    {job && <div className="results"><div className="results-heading"><div><h2>{job.totalUnique.toLocaleString()} unique repositories</h2><span>Showing a maximum of 50 records on this page</span></div><div className="result-actions"><a className="button" href={searchExportUrl(job.jobId, "json")}>Export JSON</a><a className="button" href={searchExportUrl(job.jobId, "csv")}>Export CSV</a></div></div>
      {resultQuery.isPending && job.totalUnique > 0 && <div className="empty">Loading collected results...</div>}
      {results.map((repository) => <RepositoryCard key={repository.id} repository={repository} />)}
      <div className="pagination-actions"><button className="button" disabled={cursorHistory.length === 0} onClick={() => { const history = [...cursorHistory]; setPageCursor(history.pop()); setCursorHistory(history); }}>Previous</button><button className="button" disabled={!resultQuery.data?.hasMore || !resultQuery.data.nextCursor} onClick={() => { setCursorHistory((history) => [...history, pageCursor]); setPageCursor(resultQuery.data!.nextCursor ?? undefined); }}>Next 50</button></div>
    </div>}
  </section>;
}

function JobProgress({ job, onCancel, onRetry }: { job: SearchJob; onCancel: () => void; onRetry: (source: RepositorySource) => void }) {
  return <section className="job-progress"><div className="job-progress-heading"><div><span className="eyebrow">Live collection</span><h2>{job.status.replace("_", " ")}</h2></div>{!terminal.has(job.status) && <button className="button" onClick={onCancel}>Cancel search</button>}</div><div className="progress-grid">{job.sourceProgress.map((progress) => <article key={progress.source} className="progress-card"><div><strong>{progress.source}</strong><span className={`health ${progress.status}`}>{progress.status.replace("_", " ")}</span></div><b>{progress.fetched.toLocaleString()}</b><small>repositories · page {progress.pages}</small><small>Rate limit: {progress.rateLimit?.remaining ?? "unknown"}{progress.rateLimit?.limit !== null && progress.rateLimit?.limit !== undefined ? ` / ${progress.rateLimit.limit}` : ""}</small>{progress.providerLimited && <p>Provider search window reached for a single-day partition.</p>}{progress.error && <p>{progress.error.message}</p>}{(progress.status === "failed" || progress.status === "rate_limited") && <button className="button" onClick={() => onRetry(progress.source)}>{progress.status === "rate_limited" ? "Continue source" : "Retry source"}</button>}</article>)}</div></section>;
}

function RepositoryCard({ repository }: { repository: NormalizedRepository }) { return <article className="result-card"><div className="badges"><span className="source-badge">{repository.source}</span>{repository.language && <span>{repository.language}</span>}{repository.license && <span>{repository.license}</span>}</div><h3><a href={repository.repositoryUrl} target="_blank" rel="noreferrer">{repository.fullName}</a></h3><p>{repository.description || "No description supplied by the source."}</p><div className="result-meta"><span>by {repository.owner}</span><span>Stars {repository.stars.toLocaleString()}</span><span>Forks {repository.forks.toLocaleString()}</span>{repository.updatedAt && <span>Updated {new Date(repository.updatedAt).toLocaleDateString()}</span>}</div>{repository.topics.length > 0 && <div className="tags">{repository.topics.slice(0, 8).map((topic) => <span key={topic}>{topic}</span>)}</div>}</article>; }
function splitList(value: string): string[] { return value.split(",").map((item) => item.trim()).filter(Boolean); }
