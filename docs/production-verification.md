# Atlas Production Verification

Run this checklist only after the owner has rotated the exposed MongoDB credential, created the Atlas Render service, and identified its real HTTPS origin. Never paste secrets into commands, logs, tickets, or screenshots.

## Required values

- `FRONTEND_ORIGIN`: `https://atlashu.netlify.app`
- `BACKEND_ORIGIN`: the actual HTTPS origin shown by the Atlas Render service
- Netlify `VITE_API_BASE_URL`: exactly `BACKEND_ORIGIN`, without `/api`
- Render `MONGODB_URI`: a newly issued server-side Atlas URI with an explicit database name

## Deployment gates

- [ ] Render service is created from the intended repository and `main` branch.
- [ ] Render build command is `npm ci && npm run build --workspace backend`.
- [ ] Render start command is `npm run start --workspace backend`.
- [ ] Runtime binds `0.0.0.0` and the platform-provided `PORT`.
- [ ] `NODE_ENV=production` and `FRONTEND_ORIGINS=https://atlashu.netlify.app`.
- [ ] `MONGODB_URI` is configured as a Render secret and is not the exposed historical credential.
- [ ] `/api/health/ready` returns 200 before the deploy is considered healthy.
- [ ] Netlify is linked to the intended repository and uses the root `netlify.toml`.
- [ ] Netlify has production-scoped `VITE_API_BASE_URL=BACKEND_ORIGIN` before the production build.
- [ ] Netlify publishes `frontend/dist` from the repository root.

## Frontend and routing

- [ ] `GET /`, `/search`, and `/sources` each return the application HTML with HTTP 200.
- [ ] Browser refresh on `/search` and `/sources` remains HTTP 200 and preserves the route.
- [ ] The delivered JavaScript contains the real HTTPS backend origin and no localhost API origin.
- [ ] Browser network requests go directly to `BACKEND_ORIGIN/api/...` in the default configuration.
- [ ] No Netlify `/api/*` proxy rule exists unless proxy mode was deliberately selected.

Direct routing is the default: the browser uses `VITE_API_BASE_URL` to call Render and Render CORS allows the Netlify origin. Optional proxy mode requires a specific `/api/*` rewrite to the verified backend before the final `/* -> /index.html` rule; in that mode, leave `VITE_API_BASE_URL` empty. Do not configure both approaches accidentally.

## Backend health and CORS

- [ ] `GET BACKEND_ORIGIN/api/health` returns JSON, a request ID, `status=healthy`, `database=connected`, and `databaseReady=true`.
- [ ] `GET BACKEND_ORIGIN/api/health/ready` returns HTTP 200 and `status=ready`.
- [ ] The same health request with `Origin: https://atlashu.netlify.app` returns `Access-Control-Allow-Origin: https://atlashu.netlify.app`.
- [ ] A request with an unapproved origin does not receive an allow-origin header.
- [ ] No response exposes credentials, connection strings, authorization headers, or production stack traces.

## Connectors and search

- [ ] `/api/connectors` lists GitHub, GitLab, Codeberg, Gitea, and Forgejo in deterministic order.
- [ ] Each enabled connector completes a small real repository search and returns original source URLs.
- [ ] Disabled or unconfigured connectors display `disabled` or the real failure state, never fabricated availability.
- [ ] Authentication mode is accurate without revealing tokens.
- [ ] Real 403/429 responses preserve provider rate-limit metadata and retry timing.
- [ ] Fast and Deep searches preserve successful sources when another source fails.
- [ ] `/api/search` still supports the legacy bounded search contract.

## Job workflow

- [ ] `POST /api/search/jobs` returns 202 for a new job and a valid job ID.
- [ ] Polling the job shows per-source progress, counts, pages, rate limits, and safe errors.
- [ ] Results pagination returns no duplicate `(source, externalId)` identities and advances `nextCursor` correctly.
- [ ] JSON and CSV exports download successfully and contain the same persisted result set.
- [ ] Cancellation changes an active job to `cancelled` and aborts active provider requests/retry waits.
- [ ] A deliberately retryable failed source can be retried without duplicating persisted results.
- [ ] Permanent failures are not presented as retryable.

## MongoDB All mode

- [ ] Atlas DNS SRV lookup resolves from Render.
- [ ] The new database user authenticates and has only the required database permissions.
- [ ] The URI contains an explicit database name and uses Atlas TLS defaults.
- [ ] An All-mode job is rejected with `DATABASE_REQUIRED` when storage is unavailable.
- [ ] With storage ready, an All-mode job creates `search_jobs`, `repository_results`, and `search_cache` records.
- [ ] Restart the API after a completed test job and confirm the job/results remain readable.
- [ ] Run `npm run verify:storage` in an authorized environment and reconcile its counts with the API.
- [ ] Delete only synthetic verification records after recording evidence, using an explicitly scoped query.

## Evidence to retain

- [ ] Render deploy ID, commit SHA, build result, startup log, and readiness response.
- [ ] Netlify deploy ID, commit SHA, effective build settings, and environment-variable key names only.
- [ ] HTTP status, content type, request ID, and redacted response body for each endpoint.
- [ ] Per-connector outcome, authentication mode, rate-limit state, and result count.
- [ ] MongoDB persistence evidence and cleanup result without credentials or connection strings.
