# Atlas production release runbook — owner approval required

This is a checklist, not authorization. Stage 7 completion is not a production release. Record evidence without copying credentials, cookies, CSRF tokens, passwords, or private research data. Use [release-checklist.md](release-checklist.md) as the owner gate ledger.

## Global release sequence

Follow this order without skipping or reordering gates:

1. Create the replacement MongoDB user.
2. Grant the least-required permissions.
3. Update production `MONGODB_URI`.
4. Verify backend connectivity using the replacement credential.
5. Revoke/delete the historically exposed MongoDB user.
6. Confirm the old credential no longer works using revocation/account evidence; never retry or reproduce it.
7. Review remaining database users and network access.
8. Verify backup/checkpoint and restore evidence.
9. Run the Stage 6 migration with `--dry-run`.
10. Review the dry-run counts.
11. Obtain explicit approval for migration `--apply`.
12. Apply the migration and verify it with a repeated dry-run plus read-only ownership/index checks.
13. Review the exact release SHA and pull request, then separately approve merge/push.
14. Deploy Render, then Netlify, with separate deployment approvals.
15. Run hosted production verification; roll back through the reviewed matrix if any release gate fails.

Migration apply never occurs automatically. Production deployment cannot begin before credential revocation, migration review, and explicit migration approval are complete. Git-history cleanup remains optional defense-in-depth after credential revocation and requires separate coordination.

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

This section is executed only at global step 13, after credential revocation and the approved migration has been applied and verified. Only after separate owner approval, review staged paths, test evidence, and credential scans. Commit/merge/push are separate decisions. Record the approved commit SHA; do not rewrite Git history as part of this release.

## D. Render deployment

Only at global step 14 and after separate Render approval, deploy the intended reviewed backend commit. Confirm `render.yaml` branch and disabled auto-deploy match the owner's strategy; `main` is the current descriptor expectation, not a Stage 6 branch auto-deploy. Build remains `npm ci --include=dev && npm run build --workspace backend`, start remains `npm run start --workspace backend`, and readiness remains `/api/health/ready`. Verify the platform-provided `RENDER_GIT_COMMIT` via `/api/version`. Do not expose the new database URI in logs.

## E. Netlify deployment

Only after the separately approved Render deployment and a separate Netlify approval, deploy the reviewed frontend with the `/api/*` rewrite before `/*`, CSP headers, and no `VITE_API_BASE_URL`. Verify browser requests are same-origin and that cookies are host-only, HttpOnly, Secure, SameSite=Strict. Do not assume static TOML tests prove CDN behavior.

## F. Database migration

This section is executed at global steps 9–12, before Git merge/push or deployment. Prepare the default workspace and owner through controlled CLI in the approved environment. Run `node scripts/migrate-stage6-workspace.mjs --dry-run` with an approved `MONGODB_URI` supplied securely. Review category counts. During a maintenance window, run `--apply` only with explicit owner migration approval; rerun dry-run to confirm zero missing keys. The script is idempotent and does not delete historical records. Keep old application traffic blocked during the cutover so old unauthenticated code does not write new missing-key records.

The exact sequence is: (1) verified backup/checkpoint, (2) `--dry-run`, (3) owner reviews category counts, (4) explicit migration approval, (5) `--apply`, (6) repeat dry-run and read-only index/ownership verification, (7) validate the application deployment. Never automate or imply approval for step 5.

## G. Post-deployment verification

Follow [production-verification.md](production-verification.md): expected commit, health/readiness, valid/invalid login, logout, expired/disabled session, CSRF rejection, protected reads/writes, A/B workspace isolation, search/history/detail/export, saved/collections/watchlists/changes/analytics/AI, persistence/restart, CSP, cookie attributes, token storage, secret-safe responses/logs. The second workspace requires deliberately created isolated test data and separate owner approval; do not create production users during Stage 6 local work.

## H. Rollback

Stop writes before any rollback. Roll back Netlify and Render independently to the last approved deployments, verifying SHA and health. Do not restore or reuse the exposed MongoDB credential. Additive `workspaceKey` backfills and original IDs remain; do not undo them by deleting data. An old unauthenticated build is **not** a safe rollback target once protected multi-workspace data exists. If auth or migration fails, keep the service in maintenance/read-only outage and restore a reviewed backup into an isolated environment for diagnosis. Owner decides whether a forward fix or compatible secure build is safer. Record every operation and re-verify access boundaries.

See [release-checklist.md](release-checklist.md) for the frontend, backend, authentication, proxy/cookie, migration, AI-provider, and database-connectivity rollback matrix.
