# Stage 6 — authentication and workspace isolation

The [73-case automated coverage map](stage-6-test-matrix.md) lists the exact test file and test name for every acceptance case.

Stage 6 is a local implementation, not deployment authorization. The owner must separately approve credential replacement, database access review, migration, merge/push, and deployment. The historically exposed MongoDB credential must never be used for testing; revocation is mandatory even if Git history is later rewritten.

## Authentication and authorization

- No public signup exists. `npm.cmd run auth:bootstrap` creates one owner for the existing `default` workspace after `ATLAS_OWNER_EMAIL` is supplied in the process environment. It prompts for a password without echoing it. It refuses if any user or default owner already exists. Run only against an explicitly approved database; it is not called during local verification.
- `npm.cmd run auth:reset-password` uses the same email input and hidden password prompt. It revokes active sessions before changing the hash. A failure between these operations can leave the old password in place but old sessions revoked; rerun under owner supervision.
- Passwords use asynchronous Node scrypt with a random 32-byte salt, 64-byte derived key, N=32768/r=8/p=1, versioned `scrypt-v1` representation, and constant-time comparison. Passwords must be 12–1024 characters. Email is normalized to lowercase for unique lookup; display casing is retained.
- Login always creates a new 256-bit random session token. Only SHA-256 of that token is persisted in `auth_sessions`; its raw value is sent only in a host-only, HttpOnly, Path=/, SameSite=Strict cookie. Secure is mandatory in production. Sessions default to seven days (bounded 1–30 days), have an expiry TTL index, and are rejected by the application immediately after expiration or revocation. Each request rechecks active user status, membership, and workspace existence.
- A separate HMAC-derived CSRF token is bound to the session. `GET /api/auth/csrf` returns it to the authenticated frontend; mutating application requests require `X-CSRF-Token`. Safe GET/HEAD do not. The frontend keeps the token only in memory, always sends cookie credentials, and clears token/query state on login/logout. Allowed Origin is checked on mutations and login. CSRF is not a substitute for authorization.
- The only intentionally public API paths are `/api/health`, `/api/health/ready`, `/api/version`, `/api/auth/login`, and idempotent `/api/auth/logout`. `/api/auth/me` and `/api/auth/csrf` require a session. All other `/api` routes are gated by session, membership, and CSRF before router dispatch. Login has its own 5-per-15-minute client limiter, alongside existing API/search/watch/AI limits.

## Ownership and migration

All normal workspace-owned Mongoose schemas require an explicit `workspaceKey` and have no ownership default. Services supply the authenticated workspace. Model validation rejects missing ownership on new records; the migration uses native collection updates so it can still backfill historical documents missing that field without changing IDs.

Request workspace identity is resolved from the server session, never from body/query/path input. Existing `default` IDs remain stable. `search_jobs`, `repository_results`, `search_cache`, legacy search persistence, saved records, collections, monitoring, changes, analytics, and AI records now use that workspace context. Search cache lookups require both workspace key and cache key, and the cached job is rechecked for ownership. Repository detail and export first authorize the job; result queries also include workspace identity. The legacy `/api/search` route remains authenticated and writes workspace-scoped raw/normalized/history records; no legacy read route is public.

`scripts/migrate-stage6-workspace.mjs --dry-run` reports only per-collection missing-key counts. `--apply` backfills missing `workspaceKey` with `default`, preserves IDs, verifies zero missing keys, and replaces the two legacy single-workspace unique indexes after installing compound workspace indexes. It never runs on startup. It requires an existing default workspace and active owner membership, an explicit `MONGODB_URI`, and a healthy database ping. The process should run under a maintenance window on a reviewed backup/clone before any production approval. No document contents or URI are printed. Existing records already keyed to another workspace are not rewritten. Repeat application is idempotent.

This is additive, but rolling back application code after creating multi-workspace data may expose shared-data semantics in old code. Do not roll back into an unauthenticated build while data or access depends on Stage 6 isolation. No transaction/replica-set requirement is silently added. Existing Stage 2/3 multi-write cleanup and change-event/state-update windows remain; see their stage guides. Bootstrap user+membership creation has a compensating user delete on membership failure, not a distributed transaction.

## Same-origin browser delivery

The local `netlify.toml` places a fixed `/api/*` rewrite to the Atlas Render backend before the SPA fallback. Production frontend requests remain relative `/api`; `VITE_API_BASE_URL` must be absent, and the production bundle fails fast if it is set. Host-only cookies therefore belong to the frontend origin. The proxy is limited to this fixed backend and is not an arbitrary URL fetcher. All `/api` responses use `Cache-Control: no-store` so the CDN must not cache personalized JSON or exports. Netlify's [external proxy documentation](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/) states a 26-second timeout: production AI generation is bounded to 24 seconds or less when enabled; large manual watch checks can still exceed that bound and need an asynchronous response design before release at scale. Cookie forwarding and Set-Cookie behavior must be verified in an approved non-production environment; static configuration tests cannot prove CDN behavior.

The static browser CSP restricts scripts, styles, and connections to self, disables objects/framing, and does not allow inline scripts. Charts and forms retain text/labels. The API retains Helmet, CORS, body limits, request IDs, sanitized production errors, and redacted logging, now including CSRF headers. Express trusts only one immediate proxy hop in production; Netlify/Render forwarding and rate-limit client identity require a controlled staging verification. No Render or Netlify account has been modified.

## Query-backed indexes

- `users.emailNormalized` unique; `workspaces.key` unique.
- `workspace_memberships(workspaceKey,userId)` unique, with a partial unique owner key and `userId` lookup.
- `auth_sessions.sessionTokenHash` unique, `expiresAt` TTL, and `userId` for revocation.
- `search_jobs(workspaceKey,createdAt,_id)` for history; `repository_results(workspaceKey,jobId,_id)` for detail/results; `search_cache(workspaceKey,cacheKey)` unique for isolation; legacy normalized identity is unique by workspace/source/sourceId.

## Remaining limitations and release gates

No self-registration, email reset, collaboration, or production scheduler was added. A single active owner per workspace is currently enforced. In-memory rate limits are per process, so a shared limiter is needed before horizontal scaling. A missing workspace context fails closed outside isolated tests; application HTTP is always gated. The watch worker iterates due records across workspaces and enters each record's workspace context. Long manual watch checks and Netlify proxy timeout remain a release concern. Migration and hosted cookie behavior have not been tested against production.

Before release, the owner must create a replacement least-privilege MongoDB user, update Render `MONGODB_URI`, verify the new connection, revoke/delete the exposed old user, review users/access evidence, and confirm the old credential no longer works. History rewrite is optional coordinated defense-in-depth *after* revocation, never a substitute for it. See [production-release-runbook.md](production-release-runbook.md).
