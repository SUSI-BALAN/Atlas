# Project Context

Stage 7 locally adds release preflight, safe hosted verification, read-only index diagnostics, backup/recovery guidance, and rollback gates around Stage 6 authentication and workspace isolation. It does not add a product feature or authorize production release. See `docs/stage-7-release-readiness.md`.

## Product

Atlas is a local-first Multi-Forge repository research platform. It collects public or explicitly authorized data through official APIs, preserves source provenance, normalizes provider records, and never claims to bypass provider limits.

## Architecture

- npm workspaces: `backend` and `frontend`.
- Backend: Node.js, strict TypeScript, Express, Zod, MongoDB/Mongoose, Pino.
- Frontend: React, Vite, TanStack Query, source-neutral REST contracts.
- Connectors: GitHub, GitLab, Codeberg, Gitea.com, and Forgejo Next. The three Gitea/Forgejo-compatible instances share one adapter.
- Legacy synchronous `POST /api/search` is preserved. Repository research now uses asynchronous `/api/search/jobs` routes.

## Current implementation

- Unified `RepositoryConnector` streaming contract using `AsyncGenerator<RepositorySearchBatch>`.
- Fast, Deep, and All available result modes. All mode has no application-side result limit and requires MongoDB.
- Sequential per-connector page fetching with `CONNECTOR_CONCURRENCY` bounded source concurrency.
- Cancellable exponential backoff with jitter for 429, selected 5xx, network failures, and timeouts.
- GitHub page size 100, rate-limit headers, optional token, and recursive creation-date partitioning around the provider's 1,000-result search window.
- GitLab Projects API pagination from `X-Next-Page` and total headers.
- Codeberg/Gitea/Forgejo pagination through their official compatible repository-search APIs.
- Durable `search_jobs`, `repository_results`, and TTL `search_cache` collections; per-batch bulk upserts and progress updates.
- Identity deduplication by `(jobId, source, externalId)` and exact canonical-URL duplicate detection without deleting mirrors/forks.
- Search cancellation, failed-source retry, partial completion, cursor-paged results, and streaming JSON/CSV export.
- Progressive Universal Search UI with source selection, filters, modes, live per-source progress, cancellation, retry, partial results, 50-row pages, and export.
- URL-persisted active jobs and result cursors, bounded newest-first durable history, and job-scoped normalized repository detail pages.
- Startup reconciliation marks queued/running/rate-limited persisted sources as retryable `PROCESS_INTERRUPTED` failures without replaying providers or removing collected repository results.
- Sources UI reports enabled/disabled, real health, authentication mode, search support, sanitized rate limits/reset, latency, connector version, and last check.
- `AI_PROVIDER=none` leaves all collection paths functional; AI configuration is optional and server-side only. Stage 6 protects AI routes with authenticated workspace membership.

## Environment

Canonical names are documented in `.env.example`: backend host/port/origin, MongoDB, session lifetime/cookie name, timeouts/concurrency/cache, one enabled/base/token group per connector, and optional AI configuration. Compatibility aliases for the earlier `PORT`, `FRONTEND_URL`, provider API base variables, and `SEARCH_CONCURRENCY` remain accepted. Production requires an explicit MongoDB URI and HTTPS frontend origin.

GitHub is enabled by default. GitLab, Codeberg, Gitea, and Forgejo are visible but disabled until their `*_ENABLED=true` flags are set. Tokens are optional and never returned to the browser.

## Restart recovery

After MongoDB connects, startup reconciliation inspects durable jobs in `queued`, `running`, or `rate_limited`. Atlas does not automatically replay provider requests. Each nonterminal source is changed to a retryable failed source with code `PROCESS_INTERRUPTED`; a job becomes `partially_complete` when another source had completed, otherwise `failed`. Existing cursors and `repository_results` are retained. The user can explicitly retry an affected source, using the existing cursor-aware retry behavior and unique identity index.

## Runtime limitations

- Local configuration tests cannot prove Netlify-to-Render forwarding, hosted cookie rewriting, HSTS, real trust-proxy behavior, production index state, or backup availability. These remain explicit hosted/owner verification gates.
- Workspace isolation release proof requires separately approved disposable accounts in two workspaces; the default smoke script does not create users or records.

- Saved repositories, notes, tags, collections, and AI history are shared among authenticated members of their workspace; they are not per-user private. Existing default records require controlled migration before release.

- Search/result documents are durable, but scheduling remains process-local. Interrupted work requires an explicit user retry after conservative startup reconciliation. Moving scheduling ownership to a durable queue is a future scale step.
- Retry-source resumes after the durable page cursor for linear GitLab/Gitea-style pagination; GitHub date-partition retries may revisit a partition, with persisted identity upserts preventing duplicate results.
- When MongoDB is down, Fast/Deep jobs use bounded in-process storage and All available mode returns `DATABASE_REQUIRED` instead of risking unbounded memory.
- Query expansion was not previously implemented. `MAX_EXPANDED_QUERIES` is validated/configured but collection does not depend on AI or invent expansions.

## Stage 4 analytics

The Analytics placeholder is replaced by bounded, descriptive aggregation over persisted Atlas data. A dedicated analytics service exposes summary, source, language, saved-research, collection, watchlist, change, and search reports. Source distributions are explicitly Atlas-dataset distributions, null languages are shown as `Unknown`, and date reports default to 30 days with a 365-day maximum. The responsive frontend uses independently failing TanStack Query sections and accessible text-backed HTML bars.

Stage 6 adds workspace keys to search jobs/results/cache and scopes every analytics source to the authenticated workspace. The preceding Stage 4 description reflects its original implementation, not the current release boundary. No production scheduler or infrastructure has been created.

## Verification on 2026-08-30

- `npm.cmd run typecheck`: passed for backend and frontend.
- `npm.cmd test`: passed, 30 backend tests and 1 frontend test. Remote APIs are mocked in automated tests.
- `npm.cmd run build`: passed for backend TypeScript and the Vite production bundle.
- `git diff --check`: passed; line-ending notices are repository configuration noise, not whitespace errors.
- Live isolated-port preview job: API started in explicit degraded mode because local MongoDB was unavailable; a real unauthenticated GitHub job completed, returned a normalized repository, and exposed rate-limit metadata.
- All-mode storage guard: API test confirmed HTTP 503 `DATABASE_REQUIRED` without MongoDB.
- Live MongoDB verification completed with an isolated MongoDB 7 instance: the API connected, an All available GitHub job persisted and was read back, and `npm.cmd run verify:storage` now reports legacy plus search-job/result/cache counts. Temporary database files were removed afterward.

## Security note

An actual credential was found in the previous `.env.example` during inspection and removed. It must be rotated by the repository owner because removal from the working tree does not revoke the credential or erase Git history.

## Continuation checklist

1. Read this file and `docs/architecture.md`, `docs/api.md`, `docs/connectors.md`, `docs/database.md`, and `docs/security.md`.
2. Check `git status` and preserve unrelated edits.
3. Start MongoDB before exercising All available mode or persistent cache/export behavior.
4. Enable only desired connectors and supply backend-only tokens when higher authorized limits are needed.
5. Never claim full provider coverage beyond accessible API pages or claim live persistence without observing MongoDB writes.

## Stage 5 grounded AI research

Stage 5 replaces the AI placeholder with optional, durable research sessions. The server builds bounded context only from selected search jobs, saved repositories, collections, watchlists, changes, and an explicitly requested analytics summary. Notes, source metadata, raw provider payloads, and unrelated records are never included. Provider citation IDs are matched against the supplied context; unknown citations are discarded and any response with incomplete citation validation is marked not fully grounded.

`AI_PROVIDER=none` remains the default and returns deterministic `AI_DISABLED` generation errors while the rest of Atlas operates normally. Local, OpenAI, and DeepSeek adapters share a provider-neutral contract. Generation is non-streaming, has a dedicated rate limit and timeout, and persists a user message with safe failure classification when generation fails. AI history is shared among authenticated members of the server-resolved workspace. Historical pre-Stage-6 records may require migration into the historical `default` workspace; production AI infrastructure remains outside local Stage 6 work.
