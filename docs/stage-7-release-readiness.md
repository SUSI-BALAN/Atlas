# Stage 7 — release readiness

Stage 7 adds local release gates, read-only hosted verification tooling, index inspection, recovery guidance, and an owner-run release checklist. It adds no product feature and grants no authority to deploy, migrate production data, or change hosted infrastructure. Stage 7 completion is not a production release.

The canonical operational order is the 15-step **Global release sequence** in `docs/production-release-runbook.md`. Credential replacement and verified revocation come first; backup evidence and separately approved migration apply/verification precede SHA/PR approval; Render then Netlify require separate approvals; hosted verification is last. Migration apply is never automatic, and deployment cannot begin before the credential and migration gates complete.

## Local gates

`npm.cmd run release:preflight` requires the `stage7-release-readiness` branch, base commit `226b2fa` in HEAD ancestry, a clean tree, valid unstaged and staged diffs, the required release documents, and a safe tracked-file inventory. It rejects tracked private `.env` files, tracked `dist`, unexpected `.tsbuildinfo`, and selected high-confidence credential patterns. It then runs typecheck, all tests, the production build, and a production-dependency audit. The existing tracked frontend build-info files are allowlisted but must remain clean.

Run the preflight only after reviewing and committing an approved change; its clean-tree gate is expected to fail during implementation review. It reads tracked file names/content and does not open private environment files.

## Hosted verifier

`node scripts/verify-production.mjs --base-url https://frontend.example --expected-commit <sha> --production` checks health, readiness, version identity, API JSON proxying, security headers, CSP frame protection, HSTS in HTTPS production mode, and unauthenticated rejection. It follows at most three redirects and applies a ten-second timeout. No URL is embedded in the script.

Default mode is read-only. Optional authentication reads `ATLAS_SMOKE_EMAIL` and `ATLAS_SMOKE_PASSWORD` from the process environment. It never prints the password, session value, CSRF token, or request Cookie header. Authentication checks do create and revoke one session as part of login/logout. General record mutations are absent; `--check-mutations` is rejected unless `--allow-mutations` is also present.

## Operational evidence

Capture status, safe error code, request ID, expected/reported SHA, and pass/fail results. Do not capture secrets or private research. Structured server logs include method/path/status/duration through `pino-http`, request IDs, safe classified failures, and connector identifiers where relevant. Logger redaction covers authorization, cookies, CSRF, tokens, passwords, secrets, and API keys. Release identity is available through `/api/version`; prompts and MongoDB URIs must never be logged.

The index verifier is read-only and requires an explicitly named environment variable plus `--acknowledge-read-only`. It lists indexes and fails for missing workspace ownership fields or required TTL coverage. It never creates or drops an index.
