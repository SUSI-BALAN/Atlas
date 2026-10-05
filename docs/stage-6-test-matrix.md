# Stage 6 automated coverage map

Each numbered case names an actual automated test. Parameterized `it.each` entries are shown with the instantiated path. All tests use mocks or isolated persistence; none call production MongoDB or live providers.

| Case | File | Exact test name |
| ---: | --- | --- |
| 1 | `backend/src/services/auth/auth.service.test.ts` | `uses a salted versioned password hash and verifies the correct password` |
| 2 | `backend/src/services/auth/auth.service.test.ts` | `uses a salted versioned password hash and verifies the correct password` |
| 3 | `backend/src/services/auth/auth.service.test.ts` | `uses a salted versioned password hash and verifies the correct password` |
| 4 | `backend/src/services/auth/auth.service.test.ts`; `backend/src/models/auth.model.test.ts` | `normalizes email, creates a fresh hashed session and never persists raw tokens`; `enforces normalized email and stable workspace keys` |
| 5 | `backend/src/app.auth.test.ts` | `sets a fresh cookie on success without returning the token` |
| 6 | `backend/src/app.auth.test.ts` | `uses generic login errors and rate-limits repeated attempts` |
| 7 | `backend/src/app.auth.test.ts` | `uses generic login errors and rate-limits repeated attempts` |
| 8 | `backend/src/services/auth/auth.service.test.ts` | `normalizes email, creates a fresh hashed session and never persists raw tokens` |
| 9 | `backend/src/services/auth/auth.service.test.ts` | `normalizes email, creates a fresh hashed session and never persists raw tokens` |
| 10 | `backend/src/app.auth.test.ts` | `logs out idempotently and clears the cookie` |
| 11 | `backend/src/app.auth.test.ts` | `logs out idempotently and clears the cookie` |
| 12 | `backend/src/services/auth/auth.service.test.ts` | `rejects expired, revoked, disabled-user and missing-membership sessions` |
| 13 | `backend/src/services/auth/auth.service.test.ts` | `rejects expired, revoked, disabled-user and missing-membership sessions` |
| 14 | `backend/src/models/auth.model.test.ts` | `indexes hashed sessions and expires them with Mongo TTL` |
| 15 | `backend/src/services/auth/auth.service.test.ts` | `sets host-only HttpOnly session cookies and parses only the named cookie` |
| 16 | `backend/src/app.auth.test.ts` | `returns a safe identity and session-bound CSRF token without exposing secrets` |
| 17 | `backend/src/app.auth.test.ts` | `requires CSRF for mutations but not safe GET` |
| 18 | `backend/src/app.auth.test.ts` | `requires CSRF for mutations but not safe GET` |
| 19 | `backend/src/app.auth.test.ts` | `requires CSRF for mutations but not safe GET` |
| 20 | `backend/src/app.auth.test.ts` | `requires CSRF for mutations but not safe GET` |
| 21 | `backend/src/app.auth.test.ts` | `rejects a cross-origin mutation even with a CSRF token` |
| 22 | `backend/src/services/auth/auth.service.test.ts` | `rejects expired, revoked, disabled-user and missing-membership sessions` |
| 23 | `backend/src/services/auth/auth.service.test.ts` | `rejects expired, revoked, disabled-user and missing-membership sessions` |
| 24 | `backend/src/services/searchJobs/searchJob.persistence.test.ts` | `does not read another workspace search job or its repository` |
| 25 | `backend/src/services/searchJobs/searchJob.persistence.test.ts` | `does not read a foreign repository even when its job is local` |
| 26 | `backend/src/routes/searchJobs.export.test.ts` | `never exports a foreign job when ownership lookup returns not found` |
| 27 | `backend/src/services/workspaceIsolation.test.ts` | `does not load B's saved repository or save B's result` |
| 28 | `backend/src/services/workspaceIsolation.test.ts` | `does not load B's collection, watchlist or change event` |
| 29 | `backend/src/services/workspaceIsolation.test.ts` | `does not load B's collection, watchlist or change event` |
| 30 | `backend/src/services/workspaceIsolation.test.ts` | `does not load B's collection, watchlist or change event` |
| 31 | `backend/src/services/workspaceIsolation.test.ts` | `starts analytics distribution with a workspace match` |
| 32 | `backend/src/services/workspaceIsolation.test.ts` | `does not load B's AI session` |
| 33 | `backend/src/services/workspaceIsolation.test.ts` | `filters B's selected saved context before building an AI citation` |
| 34 | `backend/src/services/searchJobs/searchJob.persistence.test.ts` | `isolates cache lookup by workspace before a job ID can be reused` |
| 35 | `backend/src/app.auth.test.ts` | `rejects unauthenticated write /api/search/jobs` |
| 36 | `backend/src/app.auth.test.ts` | `rejects unauthenticated write /api/saved` |
| 37 | `backend/src/app.auth.test.ts` | `rejects unauthenticated write /api/collections` |
| 38 | `backend/src/app.auth.test.ts` | `rejects unauthenticated write /api/watchlists` |
| 39 | `backend/src/app.auth.test.ts` | `rejects unauthenticated write /api/ai/sessions/507f191e810c19729de860aa/messages` |
| 40 | `backend/src/app.auth.test.ts` | `rejects unauthenticated read /api/analytics/summary` |
| 41 | `backend/src/app.auth.test.ts` | `keeps only health, readiness and version public` |
| 42 | `backend/src/app.auth.test.ts` | `keeps only health, readiness and version public` |
| 43 | `backend/src/app.auth.test.ts` | `keeps only health, readiness and version public` |
| 44 | `backend/src/migration.test.ts` | `dry-run reports counts only and changes nothing` |
| 45 | `backend/src/migration.test.ts` | `applies missing default ownership without changing IDs and is idempotent` |
| 46 | `backend/src/migration.test.ts` | `applies missing default ownership without changing IDs and is idempotent` |
| 47 | `backend/src/migration.test.ts` | `applies missing default ownership without changing IDs and is idempotent` |
| 48 | `backend/src/migration.test.ts` | `dry-run reports counts only and changes nothing` |
| 49 | `backend/src/migration.test.ts` | `applies missing default ownership without changing IDs and is idempotent` |
| 50 | `frontend/src/pages/LoginPage.test.tsx` | `renders accessible owner-controlled login fields` |
| 51 | `frontend/src/app/AuthGate.test.tsx` | `does not flash protected content while authentication is loading` |
| 52 | `frontend/src/pages/LoginPage.test.tsx` | `shows pending state and restores the intended route after login` |
| 53 | `frontend/src/pages/LoginPage.test.tsx` | `shows a generic error without disclosing whether the account exists` |
| 54 | `frontend/src/app/AuthGate.test.tsx` | `redirects unauthenticated visitors and remembers the intended route` |
| 55 | `frontend/src/pages/LoginPage.test.tsx` | `shows pending state and restores the intended route after login` |
| 56 | `frontend/src/pages/LoginPage.test.tsx` | `rejects external, protocol-relative and backslash redirect targets` |
| 57 | `frontend/src/pages/SettingsPage.test.tsx` | `shows only safe identity and signs out` |
| 58 | `frontend/src/pages/SettingsPage.test.tsx` | `shows only safe identity and signs out` |
| 59 | `frontend/src/services/api.test.ts` | `uses cookie credentials and a session CSRF header without browser storage` |
| 60 | `frontend/src/services/api.test.ts` | `uses cookie credentials and a session CSRF header without browser storage` |
| 61 | `frontend/src/services/api.test.ts` | `uses cookie credentials and a session CSRF header without browser storage` |
| 62 | `frontend/src/services/api.test.ts` | `uses cookie credentials and a session CSRF header without browser storage` |
| 63 | `backend/src/config/netlifyConfig.test.ts` | `routes only /api to the fixed backend before the SPA fallback` |
| 64 | `backend/src/config/netlifyConfig.test.ts` | `enforces a script-safe, same-origin browser CSP` |
| 65 | `backend/src/services/auth/auth.service.test.ts` | `sets host-only HttpOnly session cookies and parses only the named cookie` |
| 66 | `backend/src/config/env.test.ts` | `rejects unsafe production authentication and proxy settings` |
| 67 | `backend/src/app.auth.test.ts` | `preserves Helmet and request-ID headers on public responses` |
| 68 | `backend/src/middleware/errorHandler.test.ts` | `hides unexpected error messages and stacks while preserving request IDs` |
| 69 | `backend/src/services/searchJobs/searchJob.service.test.ts` | `tracks progressive job completion and deduplicates same-source repositories` |
| 70 | `backend/src/services/workspace.service.test.ts` | `unsaving removes collection and watchlist memberships plus current watch state` |
| 71 | `backend/src/services/watch/watch.service.test.ts` | `establishes the first baseline without a change event` |
| 72 | `backend/src/services/analytics/analytics.service.test.ts` | `returns persisted summary counts and dates` |
| 73 | `backend/src/services/ai/aiResearch.service.test.ts` | `rejects unknown citation identifiers` |

The numbered regression representatives are supplemented by the complete Stage 0–5 backend/frontend suites. This matrix establishes local automated coverage, not proof of production cookie forwarding, migration, or real multi-user deployment behavior.
