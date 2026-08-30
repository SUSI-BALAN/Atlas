# Project Context

## Project description

Universal Internet Platform Information Collector is a local-first web research platform. It retrieves only public or explicitly authorized data via permitted access methods, preserves raw source records, normalizes them into a source-neutral model, and exposes search and future save/monitor/analyze/export workflows. It is not an unrestricted web scraper.

## Architecture

- npm workspaces: `backend` and `frontend`.
- Backend: layered Express API, connector plugins, orchestration services, Mongoose persistence.
- Frontend: React feature modules consuming normalized REST contracts only.
- Connector core owns contracts, registry, errors, rate-limit metadata, and capability discovery.
- GitHub REST API is the first reference provider.
- Search is designed for bounded parallel connector execution and per-source partial failures.
- Raw provider shapes never become frontend contracts.

Detailed decisions live in `docs/architecture.md`, `docs/api.md`, `docs/connectors.md`, `docs/database.md`, and `docs/security.md`.

## Tech stack

- React + Vite + TypeScript
- Node.js + TypeScript + Express
- MongoDB + Mongoose
- Zod request/config validation
- Pino structured logging
- Vitest, React Testing Library, Supertest, Playwright (incremental)
- Optional future BullMQ + Redis queue and dedicated search engine

## Database

Planned collections: `users`, `sources`, `sourceConfigs`, `collectionJobs`, `rawItems`, `normalizedItems`, `savedItems`, `collections`, `searchHistory`, `watchlists`, `changeEvents`, `tags`, `notes`, `connectorHealth`, `auditLogs`, `aiConversations`, and `aiMessages`.

The canonical uniqueness key for normalized records is `(source, sourceId)`. Canonical URL is a secondary exact deduplication signal. Raw and normalized records are separate.

## Connector list and capabilities

| Connector | Status | Initial capabilities |
| --- | --- | --- |
| GitHub | Implemented reference connector | Search repositories/public users/organizations/issues/pull requests; details for repositories, public users, issues, pull requests, releases, bounded commits; rate-limit reporting |
| RSS/Atom | Planned | Feed retrieval and item normalization |
| npm | Planned | Package search/details |
| PyPI | Planned | Package search/details |
| Hacker News | Planned | Story/discussion search/details |
| GitLab | Planned | Public/authorized project data |
| Stack Exchange | Planned | Public questions/answers |
| Website | Planned, restricted | Permitted public URLs with SSRF controls |

## API routes

- Foundation: `GET /api/health`
- Connector discovery: `GET /api/connectors`, `GET /api/connectors/:id`
- Unified search: `POST /api/search`
- Planned groups: `/api/auth`, `/api/items`, `/api/collections`, `/api/saved`, `/api/watchlists`, `/api/changes`, `/api/jobs`, `/api/analytics`, `/api/export`, `/api/ai`, `/api/settings`

All APIs use a consistent success/error envelope. Unified search returns source-level status and can report `partially_completed`.

## Current milestone

M4 — Universal Search expansion. M0 architecture, M1 foundation, M2 connector framework, M3 GitHub connector, and the initial end-to-end GitHub search slice are complete.

## Implemented features

- Architecture, API, connector, database, and security decisions documented.
- npm-workspace frontend/backend foundation with strict TypeScript, production builds, safe configuration, structured redacted logging, health endpoint, MongoDB lifecycle, and responsive dashboard shell.
- Connector contracts, typed errors, capabilities, health/rate-limit models, registry, and factory.
- GitHub official REST client with optional backend token, explicit API version, timeouts, bounded pagination, unauthenticated mode, error classification, and rate-limit parsing.
- GitHub search normalization for repositories, public users/organizations, issues, and pull requests.
- GitHub detail fetching for repositories plus languages, public users/organizations, issues, pull requests, releases, and individual commits.
- Unified `POST /api/search`, controlled connector concurrency, exact deduplication with provenance retention, source-aware ranking, per-source status, and partial-failure behavior.
- Raw items, normalized items, and search history persistence in MongoDB.
- Real-data universal search UI with filter/sort controls and loading, empty, error, and partial-failure states.
- Connector status and dependency-aware health pages.
- Read-only `npm run verify:storage` helper.

## Pending features

- M4 broaden test coverage, add normalized item/detail APIs, pagination controls, caching, and durable job API
- M5–M12 research management, monitoring, more connectors, analytics, optional AI, hardening, and verification

## Environment variables

- `NODE_ENV`, `PORT`, `MONGODB_URI`, `FRONTEND_URL`
- `GITHUB_TOKEN` (optional, backend only)
- `GITHUB_API_BASE_URL`, `GITHUB_API_VERSION`
- `REQUEST_TIMEOUT_MS`, `MAX_SEARCH_RESULTS`, `SEARCH_CONCURRENCY`
- `REDIS_URL` (future), `AI_PROVIDER`, `AI_API_KEY`

No real secret belongs in source control.

## Important decisions

1. Local MVP is single-user, but domain services will accept an actor context when authorization is introduced.
2. REST and polling are sufficient initially; real-time transport is deferred until job progress requires it.
3. Official APIs precede RSS, sitemap, and permitted HTML access.
4. Provider metrics are not compared directly; ranking transforms signals per source/type.
5. In-process scheduling is acceptable only for local MVP; persistent distributed scheduling uses a queue adapter.
6. Live provider tests are opt-in; deterministic CI uses mocked HTTP responses.

## Known bugs

- No known defect in the implemented GitHub search slice.
- Port 5000 was occupied by an unrelated local service during verification, so the project default and Vite proxy were aligned on port 5001. Live verification used isolated ports 5127–5129. All temporary collector server processes were stopped afterward.
- The current local database contains raw rows from two intentionally failed persistence verification attempts; normalized records and subsequent writes are valid. Retention/cleanup tooling is deferred.

## Testing status

Verified on 2026-08-29:

- `npm run typecheck` — passed for backend and frontend.
- `npm test` — passed: 9 backend tests and 1 frontend test.
- `npm run build` — passed; backend TypeScript output and Vite production bundle generated.
- `npm audit` during install — 0 vulnerabilities.
- Live unauthenticated GitHub search through `POST /api/search` — passed with status `completed`, real repository results, provenance, and rate-limit metadata.
- MongoDB connection and persistence — passed after correcting two integration-discovered upsert/index issues; `npm run verify:storage` reported 7 GitHub raw records, 2 normalized records, and 3 completed search histories at verification time.

Live request example: query `react authentication library`, repository type, TypeScript filter, most-starred sort; first returned repository was `react-auth-kit/react-auth-kit`. This is a point-in-time verification result, not fixture data or a permanent ranking claim.

## Continuation checklist

1. Read this file and the five files under `docs/`.
2. Check `git status` before editing and preserve unrelated work.
3. Run `npm install`, then identify the current milestone and run its smallest relevant test suite.
4. Never claim live GitHub verification unless an opt-in live request actually succeeded.
5. Update this file, `CHANGELOG.md`, and relevant docs before handoff.
