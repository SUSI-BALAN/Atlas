import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { createWatchlist, deleteWatchlist, listWatchlists, updateWatchlist } from "../services/api";

const when = (value: string | null) => value ? new Date(value).toLocaleString() : "Not yet";

export function WatchlistsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const query = useQuery({ queryKey: ["watchlists"], queryFn: () => listWatchlists(), retry: false });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["watchlists"] });
  const create = useMutation({ mutationFn: () => createWatchlist({ name, description, enabled: true, checkIntervalMinutes: 1440 }), onSuccess: () => { setName(""); setDescription(""); void refresh(); } });
  const toggle = useMutation({ mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => updateWatchlist(id, { enabled }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: deleteWatchlist, onSuccess: refresh });
  return <section className="page">
    <div className="page-heading"><div><span className="eyebrow">Private workspace monitoring</span><h1>Watchlists</h1><p>Track saved repositories on a bounded schedule within this guest session.</p></div></div>
    <form className="panel form-grid" onSubmit={event => { event.preventDefault(); create.mutate(); }}><label>Name<input value={name} onChange={event => setName(event.target.value)} required maxLength={120} /></label><label>Description<input value={description} onChange={event => setDescription(event.target.value)} maxLength={2000} /></label><button className="button primary" disabled={create.isPending}>Create watchlist</button></form>
    {query.isPending && <div className="empty" role="status">Loading watchlists…</div>}
    {query.isError && <div className="notice error" role="alert">{query.error.message}</div>}
    {query.data?.watchlists.length === 0 && <div className="empty"><h2>No watchlists yet</h2><p>Create one to establish monitored repository baselines.</p></div>}
    <div className="panel-grid">{query.data?.watchlists.map(watchlist => <article className="panel" key={watchlist.watchlistId}><span className="eyebrow">{watchlist.enabled ? "Enabled" : "Disabled"}</span><h2><Link to={`/watchlists/${watchlist.watchlistId}`}>{watchlist.name}</Link></h2><p>{watchlist.description || "No description."}</p><p>{watchlist.targetCount} targets · every {watchlist.checkIntervalMinutes} minutes</p><small>Last: {when(watchlist.lastCheckedAt)} · Next: {when(watchlist.nextCheckAt)}</small><div className="actions"><button className="button" onClick={() => toggle.mutate({ id: watchlist.watchlistId, enabled: !watchlist.enabled })}>{watchlist.enabled ? "Disable" : "Enable"}</button><button className="button" onClick={() => { if (confirm(`Delete ${watchlist.name}? Saved repositories will be preserved.`)) remove.mutate(watchlist.watchlistId); }}>Delete</button></div></article>)}</div>
  </section>;
}
