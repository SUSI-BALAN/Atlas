# Atlas production release runbook — owner approval required

This is a checklist, not authorization. Stage 6 development does not run these steps. Record evidence without copying credentials, cookies, CSRF tokens, passwords, or private research data.

## A. Pre-deployment owner actions

1. Complete the dedicated MongoDB credential gate below before production release.
2. Confirm database backup and restoration procedure, schema/index privileges, deployment window, and owner for the default workspace. Review the migration dry-run counts in a safe environment. Do not publish notes, AI conversations, or URI output.
3. Verify the fixed Netlify `/api/*` proxy, cookie forwarding, `Set-Cookie`, CSRF, and 26-second timeout in non-production staging. Resolve long-running manual watch checks before relying on them through the proxy.
4. Review `FRONTEND_ORIGINS`, `NODE_ENV=production`, `MONGODB_URI`, optional AI configuration, and the absence of `VITE_API_BASE_URL` in Netlify build environment. Avoid putting any secrets in tracked descriptors.

## B. Mandatory pre-release MongoDB credential replacement and revocation

The owner must complete every step before production release, under separate approval:

1. Create a replacement MongoDB database user.
2. Grant only the least-required database permissions.
3. Update production `MONGODB_URI` securely.
4. Verify the backend connection using the replacement user.
5. Revoke/delete the historically exposed database user.
6. Review remaining database users and available access evidence.
7. Verify that the old credential is no longer usable using revocation/account evidence; do not inspect, reproduce, or retry it during Stage 6 development.

Git-history cleanup is optional defense-in-depth after credential revocation. Coordinated history rewriting never replaces credential rotation and requires separate approval.

## C. Git merge/push

Only after separate owner approval, review staged paths, test evidence, and credential scans. Commit/merge/push are separate decisions. Record the approved commit SHA; do not rewrite Git history as part of this release.

## D. Render deployment

Only after separate approval, deploy the intended reviewed backend commit. Confirm `render.yaml` branch and disabled auto-deploy match the owner's strategy; `main` is the current descriptor expectation, not a Stage 6 branch auto-deploy. Build remains `npm ci --include=dev && npm run build --workspace backend`, start remains `npm run start --workspace backend`, and readiness remains `/api/health/ready`. Verify the platform-provided `RENDER_GIT_COMMIT` via `/api/version`. Do not expose the new database URI in logs.

## E. Netlify deployment

Only after separate approval, deploy the reviewed frontend with the `/api/*` rewrite before `/*`, CSP headers, and no `VITE_API_BASE_URL`. Verify browser requests are same-origin and that cookies are host-only, HttpOnly, Secure, SameSite=Strict. Do not assume static TOML tests prove CDN behavior.

## F. Database migration

Prepare the default workspace and owner through controlled CLI in the approved environment. Run `node scripts/migrate-stage6-workspace.mjs --dry-run` with an approved `MONGODB_URI` supplied securely. Review category counts. During a maintenance window, run `--apply` only with explicit owner migration approval; rerun dry-run to confirm zero missing keys. The script is idempotent and does not delete historical records. Keep old application traffic blocked during the cutover so old unauthenticated code does not write new missing-key records.

## G. Post-deployment verification

Follow [production-verification.md](production-verification.md): expected commit, health/readiness, valid/invalid login, logout, expired/disabled session, CSRF rejection, protected reads/writes, A/B workspace isolation, search/history/detail/export, saved/collections/watchlists/changes/analytics/AI, persistence/restart, CSP, cookie attributes, token storage, secret-safe responses/logs. The second workspace requires deliberately created isolated test data and separate owner approval; do not create production users during Stage 6 local work.

## H. Rollback

Stop writes before any rollback. Roll back Netlify and Render independently to the last approved deployments, verifying SHA and health. Do not restore or reuse the exposed MongoDB credential. Additive `workspaceKey` backfills and original IDs remain; do not undo them by deleting data. An old unauthenticated build is **not** a safe rollback target once protected multi-workspace data exists. If auth or migration fails, keep the service in maintenance/read-only outage and restore a reviewed backup into an isolated environment for diagnosis. Owner decides whether a forward fix or compatible secure build is safer. Record every operation and re-verify access boundaries.
