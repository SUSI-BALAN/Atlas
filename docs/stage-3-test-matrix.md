# Stage 3 automated test matrix

Every required case is mapped to a behavioral automated test. Test names below are exact.

| # | Required case | Test file | Test name |
|---:|---|---|---|
| 1 | Create watchlist | `backend/src/services/watch/watch.service.test.ts` | `WatchService CRUD and membership > creates a watchlist with an immediately due schedule` |
| 2 | Update watchlist | `backend/src/services/watch/watch.service.test.ts` | `WatchService CRUD and membership > updates watchlist fields` |
| 3 | Delete watchlist | `backend/src/services/watch/watch.service.test.ts` | `WatchService CRUD and membership > deletes memberships and state without deleting saved repositories` |
| 4 | Enable/disable | `backend/src/services/watch/watch.service.test.ts` | `WatchService CRUD and membership > enables and disables scheduling` |
| 5 | Interval validation | `backend/src/routes/watchlists.routes.test.ts` | `watchlist routes > rejects sub-minute and short intervals` |
| 6 | Add saved repository | `backend/src/services/watch/watch.service.test.ts` | `WatchService CRUD and membership > adds a saved repository membership` |
| 7 | Duplicate membership | `backend/src/services/watch/watch.service.test.ts` | `WatchService CRUD and membership > rejects duplicate membership` |
| 8 | Remove membership | `backend/src/services/watch/watch.service.test.ts` | `WatchService CRUD and membership > removes membership and watch state` |
| 9 | Unsaved repository cannot be watched | `backend/src/services/watch/watch.service.test.ts` | `WatchService CRUD and membership > rejects an unsaved repository` |
| 10 | Watchlist deletion preserves saved repository | `backend/src/services/watch/watch.service.test.ts` | `WatchService CRUD and membership > deletes memberships and state without deleting saved repositories` |
| 11 | First check establishes baseline/no event | `backend/src/services/watch/watch.service.test.ts` | `WatchService checks > establishes the first baseline without a change event` |
| 12 | No-change check/no event | `backend/src/services/watch/watch.service.test.ts` | `WatchService checks > records an unchanged successful check without an event` |
| 13 | Stars change | `backend/src/services/watch/changeDetector.test.ts` | `change detector > reports star values` |
| 14 | Fork change | `backend/src/services/watch/changeDetector.test.ts` | `change detector > reports fork values` |
| 15 | Archived change | `backend/src/services/watch/changeDetector.test.ts` | `change detector > reports archived state` |
| 16 | Description change | `backend/src/services/watch/changeDetector.test.ts` | `change detector > reports description changes` |
| 17 | Topic additions/removals | `backend/src/services/watch/changeDetector.test.ts` | `change detector > reports topic additions and removals` |
| 18 | Missing/null fields | `backend/src/services/watch/changeDetector.test.ts` | `change detector > ignores fields absent from both snapshots`; `change detector > distinguishes null from a value` |
| 19 | Deterministic fingerprints | `backend/src/services/watch/changeDetector.test.ts` | `change detector > creates deterministic fingerprints independent of topic order`; `change detector > normalizes provider strings and Mongo dates identically` |
| 20 | Rate limit creates no false change | `backend/src/services/watch/watch.service.test.ts` | `WatchService checks > preserves baseline and creates no false event for rate_limited` |
| 21 | Timeout creates no false change | `backend/src/services/watch/watch.service.test.ts` | `WatchService checks > preserves baseline and creates no false event for timeout` |
| 22 | Provider 5xx creates no false change | `backend/src/services/watch/watch.service.test.ts` | `WatchService checks > preserves baseline and creates no false event for provider` |
| 23 | Authentication failure creates no false change | `backend/src/services/watch/watch.service.test.ts` | `WatchService checks > preserves baseline and creates no false event for authentication` |
| 24 | Safe verified not-found semantics | `backend/src/services/watch/watch.service.test.ts` | `WatchService checks > preserves baseline and creates no false event for not_found` |
| 25 | Manual run | `backend/src/services/watch/watch.service.test.ts` | `WatchService checks > runs a manual check and returns its durable run` |
| 26 | Partial run | `backend/src/services/watch/watch.service.test.ts` | `WatchService checks > completes partially and records exact result counts` |
| 27 | Concurrent-run protection | `backend/src/services/watch/watch.service.test.ts` | `WatchService checks > rejects an overlapping active run` |
| 28 | Check counts | `backend/src/services/watch/watch.service.test.ts` | `WatchService checks > completes partially and records exact result counts` |
| 29 | `nextCheckAt` calculation | `backend/src/services/watch/watch.service.test.ts` | `WatchService checks > calculates nextCheckAt from completion time` |
| 30 | Due-watchlist selection and bound | `backend/src/services/watch/watch.service.test.ts` | `WatchService checks > selects only a bounded set of due enabled watchlists` |
| 31 | ObjectId validation | `backend/src/routes/watchlists.routes.test.ts` | `watchlist routes > validates ObjectIds` |
| 32 | Watchlist pagination | `backend/src/services/watch/watch.service.test.ts` | `WatchService CRUD and membership > paginates watchlists with a stable ObjectId cursor` |
| 33 | Change pagination | `backend/src/services/watch/watch.service.test.ts` | `WatchService changes > paginates and applies every supported change filter` |
| 34 | Change filters | `backend/src/routes/changes.routes.test.ts` | `changes routes > validates and forwards bounded change filters and pagination` |
| 35 | Safe error envelope | `backend/src/routes/changes.routes.test.ts` | `changes routes > returns a sanitized production error envelope` |
| 36 | Watchlist loading/empty/error | `frontend/src/pages/WatchlistsPage.test.tsx` | `WatchlistsPage > shows the loading state`; `WatchlistsPage > shows the empty state`; `WatchlistsPage > shows the error state` |
| 37 | Create watchlist UI | `frontend/src/pages/WatchlistsPage.test.tsx` | `WatchlistsPage > creates a watchlist from validated form values` |
| 38 | Add/remove repository UI | `frontend/src/pages/WatchlistDetailPage.test.tsx` | `WatchlistDetailPage > adds and removes a saved repository` |
| 39 | Check-now UI | `frontend/src/pages/WatchlistDetailPage.test.tsx` | `WatchlistDetailPage > runs Check now for the current watchlist` |
| 40 | Change timeline | `frontend/src/pages/ChangesPage.test.tsx` | `ChangesPage > renders the repository change timeline` |
| 41 | Changed-value and topic rendering | `frontend/src/pages/ChangesPage.test.tsx` | `ChangesPage > renders factual previous and current values`; `ChangesPage > renders topic additions and removals` |
| 42 | Provider failure rendering | `frontend/src/pages/WatchlistDetailPage.test.tsx` | `WatchlistDetailPage > renders safe provider failure health` |
| 43 | Dashboard counts | `frontend/src/pages/DashboardPage.test.tsx` | `DashboardPage > shows Mongo-backed watchlist and recent-change counts` |
| 44 | Stage 0 security regression | `backend/src/middleware/errorHandler.test.ts` | `production error handler > hides unexpected error messages and stacks while preserving request IDs` |
| 45 | Stage 1 search regression | `backend/src/services/searchJobs/searchJob.service.test.ts` | `SearchJobService > tracks progressive job completion and deduplicates same-source repositories` |
| 46 | Stage 2 saved/collections regression | `backend/src/services/workspace.service.test.ts` | `WorkspaceService integrity > unsaving removes collection and watchlist memberships plus current watch state` |

Additional integrity coverage: `WatchService checks > inserts changes idempotently by run and saved repository` verifies the idempotent upsert key, and `WatchService checks > exposes the documented event-before-state failure window` demonstrates the documented non-transactional insertion/update window without production MongoDB.
