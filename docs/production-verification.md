# Atlas production verification — owner-run only

This is a future checklist, not permission to access or change production. First complete the owner gates in [production-release-runbook.md](production-release-runbook.md). Do not use, inspect, or reproduce the historically exposed MongoDB credential. Record request IDs and categories, never passwords, cookies, CSRF tokens, private notes, AI conversations, or connection strings.

## Release identity and infrastructure

- [ ] Owner confirms a replacement least-privilege MongoDB user, new Render `MONGODB_URI`, verified connection, old-user revocation, and access review.
- [ ] Owner approves migration, merge/push, Render deployment, and Netlify deployment as separate actions.
- [ ] `/api/version` reports the expected `RENDER_GIT_COMMIT`; optional `BUILD_ID` is accurately labeled.
- [ ] `/api/health` and strict `/api/health/ready` report the expected state.
- [ ] Render build/start/readiness match reviewed `render.yaml`; auto-deploy remains off unless separately authorized.
- [ ] Netlify `/api/*` forwards only to the fixed Atlas backend, before the SPA fallback. `VITE_API_BASE_URL` is absent. Browser requests stay on the frontend origin.
- [ ] Static HTML/asset responses have the reviewed CSP, referrer, nosniff, frame, and permissions headers. No inline-script allowance appears.
- [ ] Browser/API responses and logs contain no Mongo URI, API key, raw provider payload, stack trace, password, cookie, CSRF token, or private note.

## Authentication and browser security

- [ ] Valid login creates a new host-only, HttpOnly, Secure, SameSite=Strict session cookie; no browser-readable bearer token appears in localStorage, sessionStorage, or IndexedDB.
- [ ] Invalid email and wrong password have the same generic response; login throttles after the configured attempts.
- [ ] Logout revokes the session and clears the cookie; repeated logout remains safe.
- [ ] Expired and disabled-user sessions cannot read workspace data; Mongo TTL cleanup is not the only enforcement.
- [ ] Mutations without/with wrong CSRF token and cross-origin mutations are rejected; safe GET remains CSRF-free.
- [ ] Unauthenticated search, saved, collection, watchlist, analytics, changes, connectors, and AI data routes reject reads/writes. Public health/readiness/version remain available.
- [ ] Login redirects back only to a safe intended in-app route; no protected-data flash occurs during auth loading.
- [ ] With separately authorized isolated test users, workspace A cannot read B search jobs/results/exports/cache, saved data, collections, watchlists, changes, analytics, AI sessions, or AI context.

## Research regression

- [ ] Fast/Deep/All search creation, progress, history, repository detail, cancellation/retry, and JSON/CSV export work within one workspace.
- [ ] A completed job/results survive backend restart; interrupted jobs reconcile without replay or data deletion.
- [ ] Saved repository CRUD, notes/tags, collections, memberships, watchlists, check runs, and factual changes remain workspace-scoped.
- [ ] Monitoring failures retain the last valid baseline and do not fabricate changes; due worker respects per-watchlist workspace identity.
- [ ] Analytics counts and date ranges derive from persisted workspace records; unknown/empty states remain honest.
- [ ] AI disabled mode leaves non-AI features working; enabled mode grounds answers only in selected workspace context and validates citations.
- [ ] Manual watch checks and AI generation behave within Netlify's external proxy timeout; if not, treat as release blocker and redesign response flow.

## Migration and rollback

- [ ] Bootstrap is controlled, no public first-user race exists, and dry-run shows only count categories.
- [ ] Approved `--apply` backfill preserves IDs, makes search/cache/legacy records workspace-owned, and is idempotent. Re-run dry-run confirms zero missing keys.
- [ ] A reviewed backup/restore path and secure rollback commit exist. Never roll back to unauthenticated code against protected multi-workspace data or restore the exposed credential.
- [ ] Production evidence is captured without secrets and owner signs off before declaring release complete.
