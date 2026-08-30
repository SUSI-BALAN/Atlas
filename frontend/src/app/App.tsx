import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { DashboardPage } from "../pages/DashboardPage";
import { PlaceholderPage } from "../pages/PlaceholderPage";
import { SearchPage } from "../pages/SearchPage";
import { SourcesPage } from "../pages/SourcesPage";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="sources" element={<SourcesPage />} />
            {[
              ["saved", "Saved items"], ["collections", "Collections"], ["watchlists", "Watchlists"],
              ["changes", "Change history"], ["analytics", "Analytics"], ["ai", "AI research"], ["settings", "Settings"]
            ].map(([path, title]) => <Route key={path} path={path} element={<PlaceholderPage title={title} />} />)}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
