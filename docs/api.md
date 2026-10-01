# REST API Contracts

Stage 3 adds CRUD under `/api/watchlists`, membership routes under `/:watchlistId/repositories`, manual `/:watchlistId/check`, run history, and cursor-paginated `/api/changes` with validated watchlist, saved, source, type, and date filters. Existing envelopes and request IDs are preserved.

All JSON routes use `{ success, data, meta }` envelopes. Errors use `{ success: false, error: { code, message, details? }, meta }`; secrets, authorization headers, unsafe provider payloads, and production stack traces are excluded.

## Search jobs

`POST /api/search/jobs` starts a repository collection job and returns HTTP 202 (or 200 for a reusable cached job).

```json
{
  "query": "AI coding agent",
  "sources": ["github", "gitlab", "codeberg", "gitea", "forgejo"],
  "filters": { "language": ["TypeScript"], "starsMin": 10, "archived": false },
  "sort": { "field": "stars", "direction": "desc" },
  "collectionMode": "all",
  "resultLimit": null
}
```

`sources: "all"` resolves to currently enabled repository connectors. `resultLimit: null` with `collectionMode: "all"` means no internal result cap. Provider API limits still apply. All mode returns `DATABASE_REQUIRED` when MongoDB is unavailable.

- `GET /api/search/jobs/:jobId` returns job status, total unique source identities, and per-source fetched/page/rate-limit/error progress.
- `GET /api/search/jobs?cursor=<job-id>&limit=20` returns newest-first safe job summaries as `{ jobs, nextCursor, hasMore }`. The default is 20 and the maximum is 50. Summaries contain `jobId`, query, requested sources, collection mode, status, total, timestamps, and cached state only.
- `GET /api/search/jobs/:jobId/results?cursor=<object-id>&limit=50` returns `{ results, nextCursor, hasMore }`; limit is capped at 100.
- `GET /api/search/jobs/:jobId/repositories/:repositoryId` returns one normalized persisted repository only when it belongs to the named job. Both IDs are validated. Missing and wrong-job records return `REPOSITORY_RESULT_NOT_FOUND`; raw provider payloads, provenance request IDs, and credentials are excluded.
- `POST /api/search/jobs/:jobId/cancel` aborts active requests and retry waits.
- `POST /api/search/jobs/:jobId/sources/:source/retry` restarts a failed or rate-limited source while persisted identity deduplication prevents duplicate rows.
- `GET /api/search/jobs/:jobId/export?format=json|csv` streams the stored dataset from the backend.

Job states are `queued`, `running`, `rate_limited`, `partially_complete`, `completed`, `cancelled`, and `failed`. One failed source does not discard successful source results.

After an API restart, persisted nonterminal sources are changed to retryable failed entries with error code `PROCESS_INTERRUPTED`. Provider calls are not replayed automatically. Existing results and cursors remain available, and the existing source retry route is the explicit recovery action.

## Legacy synchronous search

`POST /api/search` remains available for compatibility with the original bounded, mixed-content GitHub search contract. New repository collection UI uses search jobs.

## Connector discovery and health

- `GET /api/connectors`
- `GET /api/connectors/:id`
- `GET /api/health`

Connector responses expose enabled state, anonymous/token-configured authentication, capabilities, sanitized rate-limit status, health, latency, version, and last check. Tokens are never returned.

An enabled connector reports `unavailable` until a real provider request completes. Registry presence alone is not a provider health check.

## Release identity

`GET /api/version` returns the application version, the Render commit SHA as the primary deployment identity, and an optional non-secret build ID. Production approval requires the `commit` value to match hosting deploy metadata; `buildId` may be null. Health/readiness alone does not prove which commit is running.

Search-job creation is limited to 20 attempts per client address in 15 minutes. Limit responses use the standard error envelope and `RATE_LIMITED` code.

## Saved repositories

- `POST /api/saved` accepts `{ jobId, repositoryId }` and copies trusted normalized fields from that job-scoped result. Saving is idempotent by workspace/source/external ID.
- `GET /api/saved` supports cursor pagination (maximum 50) and `source`, `language`, `tag`, `collection`, and `text` filters.
- `GET /api/saved/lookup?source=<source>&externalId=<id>` returns a saved record or `null`.
- `GET/PATCH/DELETE /api/saved/:savedId` reads, updates, or unsaves.
- `GET /api/saved/summary` returns saved and collection counts.

Notes are plain text capped at 4,000 characters. Tags are trimmed, lowercase, unique, capped at 20, and at most 32 characters.

## Collections

- `POST/GET /api/collections` creates or lists collections.
- `GET/PATCH/DELETE /api/collections/:collectionId` manages one collection.
- `GET /api/collections/:collectionId/repositories` lists referenced saved repositories.
- `POST/DELETE /api/collections/:collectionId/repositories/:savedId` adds or removes idempotent membership.

Deleting a collection never deletes saved repositories. These APIs are workspace-wide until authentication is implemented.

## Analytics

All routes return the standard `{ success, data, meta: { requestId } }` envelope.

- `GET /api/analytics/summary?from=<ISO>&to=<ISO>` returns persisted search/result/saved/collection/watchlist/change counts and latest activity dates.
- `GET /api/analytics/sources` returns deterministic Atlas dataset source counts and percentages.
- `GET /api/analytics/languages?limit=10` returns the bounded top primary languages; missing values are `Unknown` and `excludedCount` is zero.
- `GET /api/analytics/saved?limit=10` returns saved source/language distributions, tags, and collection usage without notes.
- `GET /api/analytics/collections?limit=10` returns bounded collection counts and source/language distributions without repository documents.
- `GET /api/analytics/watchlists?from=<ISO>&to=<ISO>&limit=10` returns run and target summaries plus bounded per-watchlist metrics.
- `GET /api/analytics/changes?from=<ISO>&to=<ISO>&source=github` returns factual type/source/day groups and distinct changed target counts.
- `GET /api/analytics/searches?from=<ISO>&to=<ISO>` returns job status, collection mode, source usage, average persisted result count, and daily activity.

## AI research

All AI routes use the standard envelope and remain scoped to the shared `default` workspace.

- `GET /api/ai/status` returns safe provider readiness, configured model name, and capabilities. It never returns credentials, provider bodies, or the system instruction.
- `POST /api/ai/sessions` creates a session with a title and explicit `contextSelection` references.
- `GET /api/ai/sessions?cursor=&limit=` lists sessions newest-first; limit is 1–50.
- `GET/PATCH/DELETE /api/ai/sessions/:sessionId` reads, updates, or deletes a session. Deletion removes AI messages only.
- `GET /api/ai/sessions/:sessionId/messages?cursor=&limit=` returns bounded chronological message pages.
- `POST /api/ai/sessions/:sessionId/messages` accepts `{ content, clientRequestId }`. Content is capped at 4,000 characters and request IDs make retries idempotent.

Selections allow at most 5 search jobs, 20 saved repositories, 5 collections, 5 watchlists, 20 changes, and 30 total selections. Generation is limited to 10 requests per client per 15 minutes. Safe Atlas error codes distinguish disabled, timeout, authentication, provider rate limit, malformed response, unavailable, and misconfigured states.

Date-aware routes default to the last 30 days, require ISO date-times with offsets, and reject reversed ranges or ranges over 365 days. Limits are 1–25. Source is restricted to the connector enum. Workspace-owned metrics use `workspaceKey = "default"`; collected search data is the shared Atlas dataset.
