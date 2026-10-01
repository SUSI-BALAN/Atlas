import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { authLogin } from "../services/api";

export function safeReturnPath(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !/%2f|%5c/i.test(value) && !value.startsWith("/login") ? value : "/";
}

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setPending(true); setError("");
    try {
      const user = await authLogin(email, password);
      queryClient.clear();
      queryClient.setQueryData(["auth", "me"], user);
      navigate(safeReturnPath((location.state as { from?: unknown } | null)?.from), { replace: true });
    } catch { setError("Invalid email or password, or login is temporarily unavailable."); }
    finally { setPending(false); setPassword(""); }
  };
  return <main className="auth-screen"><section className="auth-card"><h1>Sign in to Atlas</h1><p>Atlas requires an owner-created account. There is no public registration.</p><form onSubmit={submit}>
    <label htmlFor="login-email">Email</label><input id="login-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} />
    <label htmlFor="login-password">Password</label><input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
    {error && <p role="alert">{error}</p>}<button type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
  </form></section></main>;
}
