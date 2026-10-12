# Stage 1 Search Workflow

## Implemented features

- URL-driven job selection at `/search?job=<jobId>` with refresh and browser-history restoration.
- Result cursor persistence in the search URL and cursor-preserving repository detail return links.
- Bounded newest-first durable job history with status, source, mode, count, and timestamp summaries.
- Source-neutral repository detail pages using normalized persisted fields and a safe metadata allowlist.
- Explicit loading, empty, partial, provider-limited, rate-limited, retryable, and permanent-failure presentation.
- Responsive search/history/detail layouts and visible keyboard focus outlines.
- Conservative startup reconciliation for interrupted durable jobs.

## API additions

- `GET /api/search/jobs?cursor=<job-id>&limit=<1..50>`
- `GET /api/search/jobs/:jobId/repositories/:repositoryId`

Existing create, status, results, cancel, retry, and export contracts remain compatible. Result rows add the optional persisted `repositoryId` needed for internal detail navigation.

## Persistence changes

The existing `search_jobs` creation index is now compound `{ createdAt: -1, _id: -1 }` for stable history ordering. No collection was added. `repository_results` continues to use the unique `{ jobId, source, externalId }` identity index and the existing job/cursor indexes.

## Restart and recovery behavior

At startup after MongoDB connects, jobs in `queued`, `running`, or `rate_limited` are reconciled without provider replay. Their nonterminal source entries become retryable `PROCESS_INTERRUPTED` failures. Jobs with an already completed source become `partially_complete`; all others become `failed`. Persisted results, totals, and cursors are retained. Users explicitly retry eligible sources. This avoids duplicate or surprising external requests while the unique identity index protects resumed collection.

## Test evidence

Automated coverage includes URL restoration, invalid IDs, job navigation, bounded history pagination/order, job-scoped repository lookup and missing/wrong-job behavior, restart reconciliation, result preservation, detail return navigation, partial/provider-limit messaging, and the existing mode/cancellation/retry suites. Provider APIs remain mocked in automated tests.

Final command results are recorded in the Stage 1 completion report rather than predeclared here.

## Known limitations

- The scheduler remains in-process; recovery is explicit rather than automatic.
- Previous-page controls rely on the current browser session's cursor stack. The current page itself survives refresh and detail navigation through the URL.
- History is workspace-wide because authentication and per-user ownership do not yet exist.
- Detail views use already persisted normalized fields and do not fetch fresh provider data.
- Provider-wide post-collection facets are not offered because Atlas does not persist a complete facet universe.

## Stage 2 handoff

Saved items and collections are intentionally not implemented. Stage 2 can reference the stable tuple of `jobId` and `repositoryId` or copy an immutable normalized snapshot, but should define ownership/authentication boundaries before introducing user-scoped data. It must not depend on raw provider payloads or credentials.
