import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { search } from "../services/api";
import type { NormalizedItem, SearchRequest, SourceType } from "../types/api";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("");
  const [type, setType] = useState<SourceType>("repository");
  const [sort, setSort] = useState("relevance");
  const mutation = useMutation({ mutationFn: search });

  function submit(event: FormEvent) {
    event.preventDefault();
    const request: SearchRequest = {
      query, sources: ["github"], types: [type], filters: language ? { language } : {},
      sort, page: 1, perPage: 20
    };
    mutation.mutate(request);
  }

  return (
    <section className="page">
      <div className="page-heading compact"><div><span className="eyebrow">Universal search</span><h1>Search with source awareness.</h1><p>Each result is normalized without losing its GitHub provenance.</p></div></div>
      <form className="search-panel" onSubmit={submit}>
        <label className="query-field"><span>Research query</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. local AI coding assistant" required minLength={1} maxLength={256} /></label>
        <div className="filters-row">
          <label><span>Source</span><select disabled value="github"><option>github</option></select></label>
          <label><span>Type</span><select value={type} onChange={(event) => setType(event.target.value as SourceType)}><option value="repository">Repository</option><option value="user">User</option><option value="organization">Organization</option><option value="issue">Issue</option><option value="pull_request">Pull request</option></select></label>
          <label><span>Language</span><input value={language} onChange={(event) => setLanguage(event.target.value)} placeholder="Any" disabled={type !== "repository"} /></label>
          <label><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="relevance">Relevance</option><option value="recently_updated">Recently updated</option><option value="most_starred">Most starred</option><option value="most_forked">Most forked</option></select></label>
          <button className="button primary" type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Searching…" : "Search"}</button>
        </div>
      </form>
      {mutation.isError && <div className="notice error" role="alert">{mutation.error.message}</div>}
      {mutation.data?.status === "partially_completed" && <div className="notice warning">Some sources failed. Available results are shown below.</div>}
      {mutation.data?.sourceStatus.filter((status) => status.status === "failed").map((status) => <div className="notice warning" key={status.source}>{status.source}: {status.error?.message}</div>)}
      {mutation.isSuccess && mutation.data.results.length === 0 && <div className="empty"><h2>No results found</h2><p>Try broader keywords or remove a filter.</p></div>}
      {mutation.data && mutation.data.results.length > 0 && <div className="results"><div className="results-heading"><h2>{mutation.data.pagination.returned} results</h2><span>Collected from GitHub</span></div>{mutation.data.results.map((item) => <ResultCard key={`${item.source}:${item.sourceId}`} item={item} />)}</div>}
    </section>
  );
}

function ResultCard({ item }: { item: NormalizedItem }) {
  return <article className="result-card"><div className="badges"><span className="source-badge">{item.source}</span><span>{item.sourceType.replace("_", " ")}</span>{item.language && <span>{item.language}</span>}</div><h3><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a></h3><p>{item.description || "No description supplied by the source."}</p><div className="result-meta"><span>{item.author?.username ? `by ${item.author.username}` : "Author unavailable"}</span>{item.metrics.stars !== null && <span>★ {item.metrics.stars.toLocaleString()}</span>}{item.metrics.forks !== null && <span>⑂ {item.metrics.forks.toLocaleString()}</span>}{item.updatedAt && <span>Updated {new Date(item.updatedAt).toLocaleDateString()}</span>}</div>{item.tags.length > 0 && <div className="tags">{item.tags.slice(0, 6).map((tag) => <span key={tag}>{tag}</span>)}</div>}</article>;
}
