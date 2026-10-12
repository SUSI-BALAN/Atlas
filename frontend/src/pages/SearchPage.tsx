import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { cancelSearchJob, createSearchJob, getSearchJob, getSearchJobResults, listConnectors, listSearchJobs, retrySearchSource, searchExportUrl } from "../services/api";
import type { NormalizedRepository, RepositorySearchJobRequest, RepositorySource, SearchJob } from "../types/api";
import { SaveRepositoryButton } from "../components/SaveRepositoryButton";

const terminal = new Set<SearchJob["status"]>(["completed", "partially_complete", "cancelled", "failed"]);
const objectIdPattern = /^[a-f\d]{24}$/i;

export function SearchPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedJobId = searchParams.get("job");
  const selectedCursor = searchParams.get("cursor") ?? undefined;
  const validJobId = !selectedJobId || objectIdPattern.test(selectedJobId);
  const validCursor = !selectedCursor || objectIdPattern.test(selectedCursor);
  const connectors = useQuery({ queryKey: ["connectors"], queryFn: listConnectors });
  const enabledSources = useMemo(() => (connectors.data ?? []).filter((connector) => connector.enabled && connector.capabilities.repositories).map((connector) => connector.id as RepositorySource), [connectors.data]);
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState<RepositorySource[] | null>(null);
  const [mode, setMode] = useState<RepositorySearchJobRequest["collectionMode"]>("preview");
  const [language, setLanguage] = useState(""); const [topics, setTopics] = useState(""); const [license, setLicense] = useState("");
  const [starsMin, setStarsMin] = useState(""); const [archived, setArchived] = useState<"all" | "active" | "archived">("all");
  const [sortField, setSortField] = useState<RepositorySearchJobRequest["sort"]["field"]>("relevance");
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([]);
  const [historyCursor, setHistoryCursor] = useState<string | undefined>();

  useEffect(() => { setCursorHistory([]); }, [selectedJobId]);

  const selected = (sources ?? enabledSources).filter((source) => enabledSources.includes(source));
  const historyQuery = useQuery({ queryKey: ["search-history", historyCursor], queryFn: () => listSearchJobs(historyCursor, 10) });
  const createMutation = useMutation({ mutationFn: createSearchJob, onSuccess: (job) => { setCursorHistory([]); setSearchParams({ job: job.jobId }); void queryClient.invalidateQueries({ queryKey: ["search-history"] }); } });
  const jobQuery = useQuery({ queryKey: ["search-job", selectedJobId], queryFn: () => getSearchJob(selectedJobId!), enabled: Boolean(selectedJobId && validJobId), refetchInterval: (state) => state.state.data && terminal.has(state.state.data.status) ? false : 1000, retry: false });
  const resultQuery = useQuery({ queryKey: ["search-job-results", selectedJobId, selectedCursor, jobQuery.data?.totalUnique], queryFn: () => getSearchJobResults(selectedJobId!, validCursor ? selectedCursor : undefined, 50), enabled: Boolean(selectedJobId && validJobId && validCursor) && (jobQuery.data?.totalUnique ?? 0) > 0, placeholderData: (previous) => previous, retry: false });
  const cancelMutation = useMutation({ mutationFn: () => cancelSearchJob(selectedJobId!), onSuccess: () => void jobQuery.refetch() });
  const retryMutation = useMutation({ mutationFn: (source: RepositorySource) => retrySearchSource(selectedJobId!, source), onSuccess: () => void jobQuery.refetch() });

  function submit(event: FormEvent) {
    event.preventDefault();
    createMutation.mutate({
      query, sources: selected,
      filters: {
        ...(language.trim() ? { language: splitList(language) } : {}), ...(topics.trim() ? { topic: splitList(topics) } : {}),
        ...(license.trim() ? { license: splitList(license) } : {}), ...(starsMin ? { starsMin: Number(starsMin) } : {}),
        ...(archived !== "all" ? { archived: archived === "archived" } : {})
      },
      sort: { field: sortField, direction: "desc" }, collectionMode: mode, resultLimit: mode === "preview" ? 50 : mode === "expanded" ? 500 : null
    });
  }

  function toggleSource(source: RepositorySource) { setSources((current) => { const values = current ?? enabledSources; return values.includes(source) ? values.filter((item) => item !== source) : [...values, source]; }); }
  function openJob(jobId: string) { setCursorHistory([]); setSearchParams({ job: jobId }); }
  const job = jobQuery.data;
  const results = resultQuery.data?.results ?? [];
  const selectionError = !validJobId ? "This search job URL contains an invalid job ID." : !validCursor ? "This result page URL contains an invalid cursor." : null;
  const active = job && !terminal.has(job.status);

  return <section className="page">
    <div className="page-heading compact"><div><span className="eyebrow">Universal repository research</span><h1>Collect all available results.</h1><p>Atlas processes provider pages in bounded batches, persists normalized repositories, and exposes partial results while collection continues.</p></div></div>
    <div className="search-workflow-grid">
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
        {mode === "all" && <div className="notice info">This search continues through available API pages and may take longer. Results remain subject to provider API limits. MongoDB is required.</div>}
      </form>
      <aside className="history-panel" aria-label="Search history"><div className="history-heading"><div><span className="eyebrow">Durable workflow</span><h2>Search history</h2></div></div>
        {historyQuery.isPending && <p className="muted">Loading history…</p>}
        {historyQuery.isError && <p className="error-text" role="alert">{historyQuery.error.message}</p>}
        {historyQuery.data?.jobs.length === 0 && <p className="muted">No persisted jobs yet.</p>}
        <div className="history-list">{historyQuery.data?.jobs.map((item) => <button type="button" key={item.jobId} className={`history-item ${item.jobId === selectedJobId ? "selected" : ""}`} onClick={() => openJob(item.jobId)}><strong>{item.query}</strong><span><b className={`status-label ${item.status}`}>{item.status.replace("_", " ")}</b> · {item.totalUnique.toLocaleString()} results</span><small>{item.requestedSources.join(", ")} · {new Date(item.createdAt).toLocaleString()}</small></button>)}</div>
        {historyQuery.data?.hasMore && <button className="button history-more" onClick={() => setHistoryCursor(historyQuery.data?.nextCursor ?? undefined)}>Older jobs</button>}
      </aside>
    </div>
    {(createMutation.isError || selectionError || jobQuery.isError) && <div className="notice error" role="alert">{createMutation.error?.message ?? selectionError ?? jobQuery.error?.message ?? "Search job could not be loaded."}</div>}
    {jobQuery.isPending && selectedJobId && validJobId && <div className="empty" role="status"><h2>Restoring search job…</h2><p>Loading persisted progress and results.</p></div>}
    {job && <JobProgress job={job} onCancel={() => cancelMutation.mutate()} onRetry={(source) => retryMutation.mutate(source)} />}
    {job && <div className="results"><div className="results-heading"><div><h2>{job.totalUnique.toLocaleString()} unique repositories collected</h2><span>{job.totalUnique === 0 ? "No persisted results yet" : `Showing ${results.length.toLocaleString()} on this page (maximum 50)`}</span></div><div className="result-actions"><a className="button" href={searchExportUrl(job.jobId, "json")}>Export JSON</a><a className="button" href={searchExportUrl(job.jobId, "csv")}>Export CSV</a></div></div>
      {job.status === "partially_complete" && <div className="notice warning">Partial completion: available results are preserved, but one or more providers did not finish.</div>}
      {job.sourceProgress.some((progress) => progress.providerLimited) && <div className="notice warning">Provider-limited results: at least one source reached its public search window.</div>}
      {job.status === "rate_limited" && <div className="notice warning">Collection is paused by a provider rate limit. Existing results are available; continue the affected source when permitted.</div>}
      {active && job.totalUnique === 0 && <div className="empty" role="status"><h2>Collecting repositories…</h2><p>Results will appear as providers return durable batches.</p></div>}
      {!active && job.totalUnique === 0 && <div className="empty"><h2>No repositories collected</h2><p>{job.status === "failed" ? "The search failed before any results were persisted. Retry an eligible source or start a new search." : "The providers returned no matching repositories for this request."}</p></div>}
      {resultQuery.isPending && job.totalUnique > 0 && <div className="empty" role="status">Loading collected results…</div>}
      {resultQuery.isError && <div className="notice error" role="alert">{resultQuery.error.message}</div>}
      {results.map((repository) => <RepositoryCard key={repository.id} repository={repository} jobId={job.jobId} cursor={selectedCursor} />)}
      {job.totalUnique > 0 && <div className="pagination-actions"><button className="button" disabled={cursorHistory.length === 0} onClick={() => { const history = [...cursorHistory]; const previous = history.pop(); setCursorHistory(history); setSearchParams(previous ? { job: job.jobId, cursor: previous } : { job: job.jobId }); }}>Previous</button><button className="button" disabled={!resultQuery.data?.hasMore || !resultQuery.data.nextCursor} onClick={() => { setCursorHistory((history) => [...history, selectedCursor]); setSearchParams({ job: job.jobId, cursor: resultQuery.data!.nextCursor! }); }}>Next 50</button></div>}
    </div>}
  </section>;
}

export function JobProgress({ job, onCancel, onRetry }: { job: SearchJob; onCancel: () => void; onRetry: (source: RepositorySource) => void }) {
  return <section className="job-progress"><div className="job-progress-heading"><div><span className="eyebrow">Collection status</span><h2>{job.status.replace("_", " ")}</h2></div>{!terminal.has(job.status) && <button className="button" onClick={onCancel}>Cancel search</button>}</div><div className="progress-grid">{job.sourceProgress.map((progress) => <article key={progress.source} className="progress-card"><div><strong>{progress.source}</strong><span className={`health ${progress.status}`}>{progress.status.replace("_", " ")}</span></div><b>{progress.fetched.toLocaleString()}</b><small>repositories · page {progress.pages}</small><small>Rate limit: {progress.rateLimit?.remaining ?? "unknown"}{progress.rateLimit?.limit !== null && progress.rateLimit?.limit !== undefined ? ` / ${progress.rateLimit.limit}` : ""}</small>{progress.providerLimited && <p>Provider search window reached; results may be incomplete.</p>}{progress.error && <p>{progress.error.message} <strong>{progress.error.retryable ? "Retry is available." : "This failure is permanent for this job."}</strong></p>}{(progress.status === "rate_limited" || (progress.status === "failed" && progress.error?.retryable)) && <button className="button" onClick={() => onRetry(progress.source)}>{progress.status === "rate_limited" ? "Continue source" : "Retry source"}</button>}</article>)}</div></section>;
}

function RepositoryCard({ repository, jobId, cursor }: { repository: NormalizedRepository; jobId: string; cursor?: string }) {
  const detail = repository.repositoryId ? `/search/jobs/${jobId}/repositories/${repository.repositoryId}${cursor ? `?cursor=${cursor}` : ""}` : null;
  return <article className="result-card"><div className="badges"><span className="source-badge">{repository.source}</span>{repository.language && <span>{repository.language}</span>}{repository.license && <span>{repository.license}</span>}</div><h3>{detail ? <Link to={detail}>{repository.fullName}</Link> : <a href={repository.repositoryUrl} target="_blank" rel="noopener noreferrer">{repository.fullName}</a>}</h3><p>{repository.description || "No description supplied by the source."}</p><div className="result-meta"><span>by {repository.owner}</span><span>Stars {repository.stars.toLocaleString()}</span><span>Forks {repository.forks.toLocaleString()}</span>{repository.updatedAt && <span>Updated {new Date(repository.updatedAt).toLocaleDateString()}</span>}</div>{repository.topics.length > 0 && <div className="tags">{repository.topics.slice(0, 8).map((topic) => <span key={topic}>{topic}</span>)}</div>}<div className="card-actions"><SaveRepositoryButton jobId={jobId} repositoryId={repository.repositoryId} source={repository.source} externalId={repository.externalId}/></div></article>;
}
function splitList(value: string): string[] { return value.split(",").map((item) => item.trim()).filter(Boolean); }
