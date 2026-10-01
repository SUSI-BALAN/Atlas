# Atlas Multi-Forge Research

Stage 3 adds durable watchlists, direct repository checks, allowlisted snapshots, factual change history, manual checks, and a run-once worker. See `docs/stage-3-watchlists-changes.md`. Data remains in the shared unauthenticated `default` workspace.

Atlas is a local-first repository research application. It collects public or explicitly authorized repository metadata from GitHub, GitLab, Codeberg, Gitea.com, and Forgejo through their REST APIs, normalizes it, and keeps provenance links to the original sources.

## Run locally

Requirements: Node.js 20+ and MongoDB.

```powershell
npm.cmd install
npm.cmd run dev
```

The frontend runs at `http://localhost:5175`; the API defaults to `http://127.0.0.1:4000`. The Vite `/api` proxy targets that same API port. Copy `.env.example` to `backend/.env` to enable additional connectors or configure backend-only tokens. Leave `frontend/.env` without `VITE_API_BASE_URL` for local proxy mode; set `VITE_API_BASE_URL` to the deployed backend origin in Netlify production.

Production uses the root `netlify.toml` for the frontend build and SPA fallback, and `render.yaml` for an independently deployed Express service. Set `MONGODB_URI` and optional connector tokens only in Render. Set `VITE_API_BASE_URL` in Netlify to the verified Render service origin before building the production frontend.

MongoDB is required for **All available results** mode. When MongoDB is unavailable, Atlas reports degraded storage and permits only bounded Fast/Deep jobs so an unbounded collection cannot accumulate in Node.js memory.

## Search modes

- Fast: collects up to 50 results.
- Deep: collects up to 500 results.
- All available results: sequentially consumes every accessible provider page, subject to provider caps, cancellation, and rate limits. No application-side result cap is applied.

Results are normalized and persisted one batch at a time, displayed through cursor pagination, and exportable as streaming JSON or CSV. GitHub search windows over 1,000 matches are recursively partitioned by creation date; a single-day partition can still be provider-limited and is reported honestly.

Universal Search is URL-driven: `/search?job=<jobId>` restores a persisted job after refresh and browser navigation. The page includes bounded, newest-first search history, job-scoped repository detail views, explicit partial/rate-limit/provider-limit states, and cursor-aware return navigation. On API startup, interrupted durable jobs are never replayed automatically; active sources become retryable interrupted failures while previously persisted results remain intact.

Repositories can be saved from results or detail pages, annotated with plain-text notes and normalized tags, and organized into reusable collections. Saved data and collections are currently workspace-wide because authentication is not yet implemented.

The `/analytics` workspace presents real descriptive metrics from persisted searches, collected results, saved research, collections, watchlists, check runs, and change events. Date ranges are bounded to 365 days, unknown languages remain explicit, and empty installations never receive fabricated sample values. Analytics remain workspace-wide under `workspaceKey = "default"`.

## Verification

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

See [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) for current implementation status and [docs/api.md](./docs/api.md) for API contracts.

The Stage 1 implementation and handoff are recorded in [docs/stage-1-search-workflow.md](./docs/stage-1-search-workflow.md).
Stage 2 is documented in [docs/stage-2-saved-collections.md](./docs/stage-2-saved-collections.md).
Stage 3 is documented in [docs/stage-3-watchlists-changes.md](./docs/stage-3-watchlists-changes.md).
Stage 4 is documented in [docs/stage-4-analytics-insights.md](./docs/stage-4-analytics-insights.md).

The evidence-based Stage 0 feature matrix, findings, blockers, and Stage 1 acceptance criteria are recorded in [docs/stage-0-audit.md](./docs/stage-0-audit.md).
