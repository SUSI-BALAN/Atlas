# REST API Contracts

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
- `GET /api/search/jobs/:jobId/results?cursor=<object-id>&limit=50` returns `{ results, nextCursor, hasMore }`; limit is capped at 100.
- `POST /api/search/jobs/:jobId/cancel` aborts active requests and retry waits.
- `POST /api/search/jobs/:jobId/sources/:source/retry` restarts a failed or rate-limited source while persisted identity deduplication prevents duplicate rows.
- `GET /api/search/jobs/:jobId/export?format=json|csv` streams the stored dataset from the backend.

Job states are `queued`, `running`, `rate_limited`, `partially_complete`, `completed`, `cancelled`, and `failed`. One failed source does not discard successful source results.

## Legacy synchronous search

`POST /api/search` remains available for compatibility with the original bounded, mixed-content GitHub search contract. New repository collection UI uses search jobs.

## Connector discovery and health

- `GET /api/connectors`
- `GET /api/connectors/:id`
- `GET /api/health`

Connector responses expose enabled state, anonymous/token-configured authentication, capabilities, sanitized rate-limit status, health, latency, version, and last check. Tokens are never returned.
