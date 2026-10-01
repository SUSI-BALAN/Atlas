import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getRepositoryResult } from "../services/api";
import { SaveRepositoryButton } from "../components/SaveRepositoryButton";

export function RepositoryDetailPage() {
  const { jobId = "", repositoryId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const valid = /^[a-f\d]{24}$/i.test(jobId) && /^[a-f\d]{24}$/i.test(repositoryId);
  const repositoryQuery = useQuery({ queryKey: ["repository-result", jobId, repositoryId], queryFn: () => getRepositoryResult(jobId, repositoryId), enabled: valid, retry: false });
  const cursor = searchParams.get("cursor");
  const backTo = `/search?${new URLSearchParams({ job: jobId, ...(cursor ? { cursor } : {}) })}`;
  if (!valid) return <section className="page"><Link className="button" to="/search">Back to search</Link><div className="notice error" role="alert">This repository detail URL is invalid.</div></section>;
  if (repositoryQuery.isPending) return <section className="page"><Link className="button" to={backTo}>Back to results</Link><div className="empty" role="status">Loading repository details…</div></section>;
  if (repositoryQuery.isError) return <section className="page"><Link className="button" to={backTo}>Back to results</Link><div className="notice error" role="alert">{repositoryQuery.error.message}</div></section>;
  const repository = repositoryQuery.data;
  return <section className="page repository-detail"><Link className="button" to={backTo}>Back to results</Link><div className="page-heading compact"><div><span className="eyebrow">{repository.source} repository</span><h1>{repository.fullName}</h1><p>{repository.description || "No description supplied by the source."}</p></div><div className="card-actions"><SaveRepositoryButton jobId={jobId} repositoryId={repository.repositoryId} source={repository.source} externalId={repository.externalId}/><a className="button primary" href={repository.repositoryUrl} target="_blank" rel="noopener noreferrer">Open original source</a></div></div>
    <dl className="detail-grid">
      <Detail label="Owner" value={repository.owner} /><Detail label="Repository" value={repository.name} /><Detail label="Language" value={repository.language} /><Detail label="Languages" value={repository.languages.join(", ")} /><Detail label="Topics" value={repository.topics.join(", ")} /><Detail label="Stars" value={repository.stars.toLocaleString()} /><Detail label="Forks" value={repository.forks.toLocaleString()} /><Detail label="Watchers" value={repository.watchers?.toLocaleString()} /><Detail label="Open issues" value={repository.openIssues?.toLocaleString()} /><Detail label="License" value={repository.license} /><Detail label="Created" value={formatDate(repository.createdAt)} /><Detail label="Updated" value={formatDate(repository.updatedAt)} /><Detail label="Last pushed" value={formatDate(repository.pushedAt)} /><Detail label="Archived" value={repository.archived ? "Yes" : "No"} /><Detail label="Fork" value={repository.fork ? "Yes" : "No"} /><Detail label="Visibility" value={repository.visibility} />
    </dl>
    {Object.keys(repository.sourceMetadata).length > 0 && <section className="metadata-panel"><h2>Source metadata</h2><dl>{Object.entries(repository.sourceMetadata).map(([key, value]) => <Detail key={key} label={humanize(key)} value={typeof value === "string" || typeof value === "number" ? String(value) : null} />)}</dl></section>}
  </section>;
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) { return <div><dt>{label}</dt><dd>{value || "Not supplied by source"}</dd></div>; }
function formatDate(value: string | null) { return value ? new Date(value).toLocaleString() : null; }
function humanize(value: string) { return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()); }
