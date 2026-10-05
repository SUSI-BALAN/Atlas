import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthGate";
import { authLogout } from "../services/api";

export function SettingsPage() {
  const { data } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = async () => {
    setPending(true); setError("");
    try { await authLogout(); queryClient.clear(); navigate("/login", { replace: true }); }
    catch { setError("Could not sign out. Please try again."); }
    finally { setPending(false); }
  };
  return <main><h1>Account and security</h1><p>{data?.email}</p><p>Workspace: {data?.workspace.name} ({data?.workspace.role})</p><p>Session expires: {data?.expiresAt ? new Date(data.expiresAt).toLocaleString() : "Unavailable"}</p><button type="button" onClick={logout} disabled={pending}>{pending ? "Signing out…" : "Sign out"}</button>{error && <p role="alert">{error}</p>}</main>;
}
