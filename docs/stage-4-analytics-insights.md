# Stage 4: analytics and insights

Stage 4 adds descriptive analytics over persisted Atlas records. It does not call providers, infer sentiment or health, or generate AI interpretation. Every response is scoped to the current shared `workspaceKey: "default"` where the underlying model has a workspace key. Search jobs and collected repository results predate workspace ownership and therefore describe the single Atlas dataset associated with that default workspace.

## Metric definitions

- **Collected repositories**: persisted `repository_results` records. A repository collected by two jobs is two dataset records.
- **Saved repositories**, **collections**, and **watchlists**: current records in their workspace collections.
- **Recent changes**: `change_events` whose `detectedAt` is inside the requested inclusive range.
- **Monitored repositories**: distinct saved repository IDs referenced by at least one currently enabled watchlist.
- **Source distribution**: distribution of the Atlas collected dataset; it is not provider market share.
- **Unknown language**: a persisted null or empty primary language, explicitly represented as `Unknown`; `excludedCount` is therefore zero.
- **Successful, partial, and failed checks**: durable `watch_check_runs` grouped by status. Rate-limited checks sum the stored rate-limited target count.
- **Average collections per saved repository**: collection-membership rows divided by all saved repositories, including saved repositories in no collection.

Percentages use the relevant full persisted total, are rounded to two decimal places, and are zero when that total is zero. Dates and old/new repository values are factual stored values only.

## API and validation

The `/api/analytics` endpoints are `summary`, `sources`, `languages`, `saved`, `collections`, `watchlists`, `changes`, and `searches`. Date-aware reports default to the last 30 days, accept ISO date-times with offsets, reject `from > to`, and cap ranges at 365 days. List limits default to 10 and are bounded to 1–25. The optional source filter is a fixed provider enum; request fields never become arbitrary aggregation field names.

Responses use the normal Atlas envelope and request IDs. Aggregations project only metric data: no saved notes, provider payloads, request headers, tokens, stack traces, or MongoDB connection information are returned.

## Query behavior and indexes

Aggregation pipelines filter workspace-owned collections before grouping and use bounded collection/watchlist result lists. Stage 4 adds `{ workspaceKey, source, detectedAt }` on `change_events` for source-filtered date reports and `{ workspaceKey, status, createdAt }` on `watch_check_runs` for status/time monitoring reports. Existing saved, collection, watchlist, and change-date indexes serve the remaining queries.

Collection and watchlist summaries use aggregation lookups instead of per-row requests. Distribution and timeline responses contain grouped values rather than raw records, so their response size is bounded by providers, languages, change types, days, or the validated list limit.

## Frontend and accessibility

`/analytics` provides overview, repository source, language, monitoring, change timeline, saved-research, and changed-field sections. Each section loads and fails independently through TanStack Query with a one-minute stale time. Date range and source are restored from URL query parameters. Empty installations show explicit empty messages rather than sample data.

Charts use responsive HTML/CSS bars with an accessible chart label, visible category names, counts, and percentages. Information is never encoded only by color, controls are keyboard accessible, focus remains visible, and layouts collapse without horizontal data tables on narrow screens.

## Limitations and Stage 5 handoff

- Authentication is still absent; analytics are workspace-wide, not private or per-user.
- Search/result records have no workspace key in the current schema and represent the one shared Atlas dataset.
- Aggregations are computed on request; no analytics cache or materialized rollup is introduced.
- CSV analytics export is deferred because it is optional and would duplicate report serialization in this stage.
- The dashboard keeps its backward-compatible Stage 3 summary call; consolidation can occur later without changing this API.
- Stage 5 may consume these factual APIs but must not reinterpret them as AI conclusions without a separate, cited design.
