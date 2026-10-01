import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authMe } from "../services/api";

export function useAuth() { return useQuery({ queryKey: ["auth", "me"], queryFn: authMe, retry: false, staleTime: 30_000 }); }
export function useRefreshAuth() { const queryClient = useQueryClient(); return () => queryClient.invalidateQueries({ queryKey: ["auth", "me"] }); }

export function AuthGate({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const expired = () => { queryClient.clear(); void queryClient.invalidateQueries({ queryKey: ["auth", "me"] }); };
    window.addEventListener("atlas-auth-expired", expired);
    return () => window.removeEventListener("atlas-auth-expired", expired);
  }, [queryClient]);
  const auth = useAuth();
  const location = useLocation();
  if (auth.isPending) return <main className="auth-screen" role="status">Checking your session…</main>;
  if (auth.isError) {
    const message = auth.error instanceof Error ? auth.error.message : "";
    if (!/Authentication required/.test(message)) return <main className="auth-screen" role="alert">Unable to check your session. Refresh to try again.</main>;
    const intended = `${location.pathname}${location.search}`;
    return <Navigate to="/login" replace state={{ from: intended }} />;
  }
  return children;
}
