# Atlas Multi-Forge Research

Stage 7 adds local release preflight, bounded hosted verification, read-only index diagnostics, and backup/rollback guidance around the Stage 6 security model. It adds no product feature and is not deployment authorization. See [the Stage 7 guide](docs/stage-7-release-readiness.md), [release checklist](docs/release-checklist.md), and [release runbook](docs/production-release-runbook.md).

Atlas is a local-first repository research application. It collects public or explicitly authorized repository metadata from GitHub, GitLab, Codeberg, Gitea.com, and Forgejo through their REST APIs, normalizes it, and keeps provenance links to the original sources.

## Run locally

Requirements: Node.js 20+ and MongoDB.

```powershell
npm.cmd install
npm.cmd run dev
```

The frontend runs at `http://localhost:5175`; the API defaults to `http://127.0.0.1:4000`. The Vite `/api` proxy targets that API port. Copy `.env.example` to `backend/.env` for local configuration; do not commit it. Supply `ATLAS_OWNER_EMAIL` to `npm.cmd run auth:bootstrap` and enter a 12–1024-character owner password at the hidden prompt, using only an explicitly approved local database. No public registration exists.

Production configuration now prefers same-origin `/api` proxying through Netlify to the fixed Render backend. `VITE_API_BASE_URL` must be absent in production. The local `render.yaml` remains non-auto-deploying; a release requires separate owner approvals and historical MongoDB credential revocation before any deployment.

MongoDB is required for **All available results** mode. When MongoDB is unavailable, Atlas reports degraded storage and permits only bounded Fast/Deep jobs so an unbounded collection cannot accumulate in Node.js memory.

## Search modes

- Fast: collects up to 50 results.
- Deep: collects up to 500 results.
- All available results: sequentially consumes every accessible provider page, subject to provider caps, cancellation, and rate limits. No application-side result cap is applied.

Results are normalized and persisted one batch at a time, displayed through cursor pagination, and exportable as streaming JSON or CSV. GitHub search windows over 1,000 matches are recursively partitioned by creation date; a single-day partition can still be provider-limited and is reported honestly.

Universal Search is URL-driven: `/search?job=<jobId>` restores a persisted job after refresh and browser navigation. The page includes bounded, newest-first search history, job-scoped repository detail views, explicit partial/rate-limit/provider-limit states, and cursor-aware return navigation. On API startup, interrupted durable jobs are never replayed automatically; active sources become retryable interrupted failures while previously persisted results remain intact.

Repositories can be saved from results or detail pages, annotated with plain-text notes and normalized tags, and organized into reusable collections. All application research routes require a server-authenticated workspace membership. Members of the same workspace share its data; this is not per-user private storage.

The `/analytics` workspace presents real descriptive metrics from persisted searches, collected results, saved research, collections, watchlists, check runs, and change events. Date ranges are bounded to 365 days, unknown languages remain explicit, and empty installations never receive fabricated sample values. Analytics are scoped to the authenticated workspace.

The optional `/ai` workspace provides grounded research sessions over explicitly selected Atlas records. `AI_PROVIDER=none` is the supported default and leaves every non-AI feature available. Local, OpenAI, and DeepSeek adapters are server-side only; saved notes, raw provider metadata, secrets, and unselected records are excluded from AI context. AI research history is shared by authenticated members of its workspace.

## Verification

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run release:preflight
```

The preflight intentionally requires a clean `stage7-release-readiness` tree. Hosted checks require an explicit URL: `node scripts/verify-production.mjs --base-url https://frontend.example --expected-commit <sha> --production`. Do not point this at a hosted environment without separate authorization. Default hosted checks are read-only; optional smoke credentials are read from `ATLAS_SMOKE_EMAIL` and `ATLAS_SMOKE_PASSWORD` and are never printed.

See [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) for current implementation status and [docs/api.md](./docs/api.md) for API contracts.

The Stage 1 implementation and handoff are recorded in [docs/stage-1-search-workflow.md](./docs/stage-1-search-workflow.md).
Stage 2 is documented in [docs/stage-2-saved-collections.md](./docs/stage-2-saved-collections.md).
Stage 3 is documented in [docs/stage-3-watchlists-changes.md](./docs/stage-3-watchlists-changes.md).
Stage 4 is documented in [docs/stage-4-analytics-insights.md](./docs/stage-4-analytics-insights.md).
Stage 5 is documented in [docs/stage-5-ai-research.md](./docs/stage-5-ai-research.md).
Stage 6 is documented in [docs/stage-6-auth-production-hardening.md](./docs/stage-6-auth-production-hardening.md).
Stage 7 is documented in [docs/stage-7-release-readiness.md](./docs/stage-7-release-readiness.md).

The evidence-based Stage 0 feature matrix, findings, blockers, and Stage 1 acceptance criteria are recorded in [docs/stage-0-audit.md](./docs/stage-0-audit.md).
