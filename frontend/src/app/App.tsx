import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { DashboardPage } from "../pages/DashboardPage";
import { PlaceholderPage } from "../pages/PlaceholderPage";
import { SearchPage } from "../pages/SearchPage";
import { RepositoryDetailPage } from "../pages/RepositoryDetailPage";
import { SourcesPage } from "../pages/SourcesPage";
import { SavedPage } from "../pages/SavedPage";
import { SavedDetailPage } from "../pages/SavedDetailPage";
import { CollectionsPage } from "../pages/CollectionsPage";
import { CollectionDetailPage } from "../pages/CollectionDetailPage";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="search/jobs/:jobId/repositories/:repositoryId" element={<RepositoryDetailPage />} />
            <Route path="sources" element={<SourcesPage />} />
            <Route path="saved" element={<SavedPage />} />
            <Route path="saved/:id" element={<SavedDetailPage />} />
            <Route path="collections" element={<CollectionsPage />} />
            <Route path="collections/:id" element={<CollectionDetailPage />} />
            {[
              ["watchlists", "Watchlists"],
              ["changes", "Change history"], ["analytics", "Analytics"], ["ai", "AI research"], ["settings", "Settings"]
            ].map(([path, title]) => <Route key={path} path={path} element={<PlaceholderPage title={title} />} />)}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
