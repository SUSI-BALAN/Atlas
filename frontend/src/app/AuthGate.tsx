import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { bootstrapGuestSession } from "../services/api";

export function useAuth() { return useQuery({ queryKey: ["auth", "session"], queryFn: bootstrapGuestSession, retry: false, staleTime: 30_000 }); }
export function useRefreshAuth() { const queryClient = useQueryClient(); return () => queryClient.invalidateQueries({ queryKey: ["auth", "session"] }); }

export function AuthGate({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const expired = () => { queryClient.clear(); void queryClient.invalidateQueries({ queryKey: ["auth", "session"] }); };
    window.addEventListener("atlas-auth-expired", expired);
    return () => window.removeEventListener("atlas-auth-expired", expired);
  }, [queryClient]);
  const auth = useAuth();
  if (auth.isPending) return <main className="auth-screen" role="status">Preparing your private workspace…</main>;
  if (auth.isError) return <main className="auth-screen" role="alert"><h1>Atlas is temporarily unavailable</h1><p>Your private workspace could not be created. No shared fallback workspace was used. Refresh to try again.</p></main>;
  return children;
}
