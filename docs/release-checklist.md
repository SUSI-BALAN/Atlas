# Atlas release checklist

Every hosted, database, Git, credential, and deployment action requires its own owner approval. Record evidence without secrets. Stage 7 completion is not production release authorization.

The canonical order is the 15-step **Global release sequence** in [production-release-runbook.md](production-release-runbook.md): credential replacement and verified revocation, access review, verified recovery evidence, migration dry-run/count review/separate apply approval and verification, exact SHA/PR and merge approval, separately approved Render then Netlify deployments, and hosted verification or rollback. Migration apply is never automatic, and deployment cannot begin before the credential and migration gates are complete.

## Pre-release gates

- [ ] Stage 0–7 tests, typecheck, production build, diff checks, production dependency audit, and secret scans pass.
- [ ] Replacement production database credential is installed and verified; the historically exposed user is revoked and confirmed unusable; remaining database users and network access are reviewed.
- [ ] Backup/checkpoint and restore drill evidence are current.
- [ ] Stage 6 migration dry-run counts and index expectations are reviewed.
- [ ] Pull request and exact release SHA are reviewed; production environment is prepared with no `VITE_API_BASE_URL`.
- [ ] `AI_PROVIDER=none` is accepted or the selected provider is separately approved.

## Backend release gates

- [ ] Deploy the approved SHA only after separate authorization.
- [ ] `/api/health` reports process health; `/api/health/ready` reports dependency readiness.
- [ ] `/api/version` reports the exact expected `RENDER_GIT_COMMIT`.
- [ ] Structured logs show request IDs, routes, status, duration, safe codes, and no secrets.

## Frontend release gates

- [ ] `/api/*` reaches Render through the Netlify rule before the SPA fallback and returns API JSON.
- [ ] `Set-Cookie` passes through; authenticated requests stay on the frontend origin.
- [ ] CSP includes compatible same-origin `connect-src` and `frame-ancestors`; other security headers pass.
- [ ] Login cookie is host-only, HttpOnly, Secure, SameSite=Strict, Path=/, with no unnecessary Domain.

## Post-release gates

- [ ] Login, `/api/auth/me`, CSRF retrieval/rejection, logout, and post-logout rejection pass.
- [ ] Two approved disposable accounts prove workspace A cannot read workspace B search, results, cache, saved, collection, watchlist, change, analytics, or AI data.
- [ ] Search, saved records, collections, watchlists, analytics, and configured AI mode pass without destructive data.
- [ ] Restart durability preserves completed research and conservatively reconciles interrupted jobs.
- [ ] Proxy, trust-proxy/rate-limiter tests, database indexes, and sanitized logs pass.
- [ ] Owner records the result and any rollback decision.

## Rollback matrix

| Failure | Detection | Safe response | Validation |
|---|---|---|---|
| Frontend deployment | asset/UI/proxy smoke fails | restore the last reviewed frontend deploy | assets, CSP, proxy and login pass |
| Backend deployment | readiness/version/API fails | restore the last compatible backend SHA | readiness and exact version pass |
| Authentication | login/me/logout or limiter fails | roll back the application pair; preserve current database credentials | session and CSRF matrix passes |
| Proxy/cookie | API becomes SPA/cookie missing | restore reviewed Netlify configuration/deploy | same-origin auth and Set-Cookie pass |
| Migration | counts/errors differ | stop application writes, preserve evidence, restore approved checkpoint or apply reviewed corrective migration | dry-run is zero/expected and indexes pass |
| AI provider | safe status/generation fails | set `AI_PROVIDER=none` through approved config change | non-AI regression remains healthy |
| Database connectivity | readiness/log code fails | stop release, correct approved access/config or restore service | connection, readiness, indexes pass |

The exposed historical credential is forbidden in every rollback path. Never roll an authenticated multi-workspace database back to incompatible unauthenticated application code.
