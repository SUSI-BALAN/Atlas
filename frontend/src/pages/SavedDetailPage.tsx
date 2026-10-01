import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { addToWatchlist, getSaved, listWatchlists } from "../services/api";

export function SavedDetailPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["saved", id], queryFn: () => getSaved(id), retry: false });
  const watchlists = useQuery({ queryKey: ["watchlists"], queryFn: () => listWatchlists(), retry: false });
  const add = useMutation({
    mutationFn: (watchlistId: string) => addToWatchlist(watchlistId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["watchlists"] })
  });
  return <section className="page">
    <Link className="button" to="/saved">Back to saved</Link>
    {query.isPending && <div className="empty">Loading saved repository…</div>}
    {query.isError && <div className="notice error" role="alert">{query.error.message}</div>}
    {query.data && <>
      <div className="page-heading"><div><span className="eyebrow">{query.data.source} provenance</span><h1>{query.data.fullName}</h1><p>{query.data.description || "No description supplied by the source."}</p></div><a className="button primary" href={query.data.repositoryUrl} target="_blank" rel="noopener noreferrer">Open original source</a></div>
      <div className="panel"><h2>Workspace note</h2><p>{query.data.note || "No note."}</p><div className="tags">{query.data.tags.map(tag => <span key={tag}>{tag}</span>)}</div></div>
      <div className="panel"><h2>Add to watchlist</h2><p>Watching uses this saved identity; it does not create another saved record.</p><div className="actions">{watchlists.data?.watchlists.map(w => <button className="button" key={w.watchlistId} disabled={add.isPending} onClick={() => add.mutate(w.watchlistId)}>{w.name}</button>)}</div>{add.isError && <div className="notice error">{add.error.message}</div>}</div>
    </>}
  </section>;
}
