import { useAuth } from "../app/AuthGate";

export function SettingsPage() {
  const { data } = useAuth();
  return <section className="page"><div className="page-heading"><div><span className="eyebrow">Privacy</span><h1>Your Atlas session</h1><p>No account, email, or password is required.</p></div></div><div className="panel"><h2>{data?.kind === "guest" ? "Private guest workspace" : "Authenticated owner workspace"}</h2><p>Guest research is isolated from every other visitor by a server-created identity. It stays with this browser session and does not transfer to another browser or device.</p><p>Session expires: {data?.expiresAt ? new Date(data.expiresAt).toLocaleString() : "Unavailable"}</p></div></section>;
}
