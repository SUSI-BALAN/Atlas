# Stage 0 Release Review

Prepared on 2026-09-28 from branch `stage0-audit-hardening`. This report is sanitized: it does not include deleted `.env.example` lines, credential values, connection strings, or raw secret-bearing history.

## Approval boundaries

- No files are currently staged.
- Commit approval permits staging the exact list below, rescanning the staged snapshot, and creating the proposed local commit only.
- Push and production deployment require later, separate approvals.
- Credential revocation or rotation and the database access review are owner actions and were not performed locally.

## Sanitized change review

### Security and deployment

- Replaced the working-tree MongoDB example with a synthetic localhost-only value while preserving the existing environment keys.
- Added safe unexpected-error classification. Production 500 responses no longer expose exception messages or stacks, and logs avoid raw unexpected `Error` objects.
- Added production proxy trust and a dedicated 20-per-15-minute search-job creation limit.
- Added `/api/version`; `RENDER_GIT_COMMIT` is the required production identity and `BUILD_ID` is optional supplemental metadata.
- Changed initial connector health from fabricated success to `unavailable` until a real request succeeds.
- Pinned the patched `qs` version and added Netlify clickjacking, MIME, referrer, permissions, and immutable-asset headers.
- Corrected the documented Netlify origin and a Render Blueprint spacing defect.

### Search workflow

- Restricted source retry to rate-limited or explicitly retryable failures.
- Kept cancellation, partial results, cursor pagination, source selection, Fast, Deep, All, and legacy search contracts intact.
- Kept MongoDB collection names and the unique `(jobId, source, externalId)` persistence key intact.
- Made the search-job router injectable only for isolated route testing; its default production composition is unchanged.

### Automated coverage

- Added production error-response and safe-log-classification tests.
- Added asynchronous partial-completion and non-overlapping cursor-page tests.
- Added multi-page JSON/CSV export parity and escaping tests.
- Added retry deduplication coverage and an assertion for the MongoDB unique-index invariant.
- Added production-style trusted-proxy rate-limit tests.
- Added populated and missing release-identity tests.
- Added Netlify security-header configuration tests.
- Updated frontend retry-action coverage for permanent and retryable failures.

## Validation evidence

| Validation | Executed result |
| --- | --- |
| Backend and frontend typecheck | Passed |
| Backend tests | 24 files, 50 tests passed |
| Frontend tests | 5 files, 11 tests passed |
| Backend production build | Passed |
| Frontend production build | Passed; 92 modules transformed |
| Production dependency audit | 0 vulnerabilities |
| `git diff --check` | Passed; line-ending notices only |
| Public working-tree scan | 124 files scanned; 0 redacted matches |
| Generated production-artifact scan | 107 files scanned; 0 redacted matches |
| Newly staged files | None |

The current Git index still represents the baseline because nothing is staged. A redacted index scan therefore reports one historical match in `.env.example`. After approval, staging the remediated file must replace that index entry, and a zero-match staged-snapshot scan is mandatory before committing.

## Untested production workflows

- The remediated commit is not deployed; production `/api/version` and static headers do not yet represent this worktree.
- Real connector searches, provider quota behavior, and provider-specific 403/429 responses were not exercised during remediation.
- Production Fast, Deep, and All jobs, cancellation, retry, restart durability, cursor paging, and exports remain unverified.
- Production MongoDB write/read persistence, least-privilege permissions, indexes, cache behavior, and synthetic-record cleanup remain unverified.
- Render repository/branch linkage, deploy identity, environment-key configuration, and rollback behavior require account-side verification.
- Netlify repository linkage, effective build settings, environment-key configuration, routing, and response headers require post-deployment verification.
- The Mongo retry test uses isolated in-process behavior and validates the real schema index; it does not start a disposable MongoDB server.

## Exact staging list

After explicit commit approval, stage only these files:

```text
.env.example
CHANGELOG.md
README.md
backend/package.json
backend/src/app.rateLimit.test.ts
backend/src/app.ts
backend/src/config/env.test.ts
backend/src/config/env.ts
backend/src/config/netlifyConfig.test.ts
backend/src/connectors/forge/forge.connector.ts
backend/src/connectors/github/github.connector.ts
backend/src/connectors/gitlab/gitlab.connector.ts
backend/src/database/mongoose.ts
backend/src/middleware/errorHandler.test.ts
backend/src/middleware/errorHandler.ts
backend/src/routes/connectors.routes.test.ts
backend/src/routes/connectors.routes.ts
backend/src/routes/health.routes.test.ts
backend/src/routes/searchJobs.export.test.ts
backend/src/routes/searchJobs.routes.test.ts
backend/src/routes/searchJobs.routes.ts
backend/src/routes/version.routes.test.ts
backend/src/routes/version.routes.ts
backend/src/server.ts
backend/src/services/collection/persistCollectedItems.ts
backend/src/services/search/search.service.ts
backend/src/services/searchJobs/searchJob.service.test.ts
backend/src/services/searchJobs/searchJob.service.ts
backend/src/utils/safeError.test.ts
backend/src/utils/safeError.ts
docs/api.md
docs/production-verification.md
docs/security.md
docs/stage-0-audit.md
docs/stage-0-release-review.md
frontend/src/pages/SearchPage.test.tsx
frontend/src/pages/SearchPage.tsx
netlify.toml
package-lock.json
render.yaml
```

Required pre-commit checks after staging:

1. Confirm `git diff --cached --name-only` exactly matches this list.
2. Run the redacted credential scanner against staged blobs and require zero matches.
3. Review `git diff --cached --stat` and a sanitized staged diff that excludes `.env.example` deleted content.
4. Run `git diff --cached --check`.
5. Do not commit if an unexpected path, generated artifact, credential pattern, or submodule change appears.

Proposed commit message:

```text
fix: harden Stage 0 release path

- sanitize example configuration and unexpected errors
- add release identity, rate limiting, and connector health guards
- cover partial results, paging, exports, retries, and deployment headers
- document credential and production verification gates
```

## Safe release procedure

1. Owner confirms the historical MongoDB credential was revoked or rotated and completes an access review. Record confirmation without recording secret values.
2. Obtain explicit commit approval. Stage only the reviewed list, rerun staged-snapshot scanning and checks, create the local commit, and report its SHA. Do not push yet.
3. Obtain explicit push approval. Push the reviewed branch and verify the remote SHA without merging.
4. Obtain separate production deployment approval and confirm access to the existing Atlas Render service and existing Atlas Netlify site. Do not create replacements.
5. In the existing Render service, verify repository and branch linkage, build/start commands, health-check path, and environment-variable names. Confirm the replacement `MONGODB_URI` is server-side, `NODE_ENV=production`, and `FRONTEND_ORIGINS` is the approved Netlify origin. Never display values.
6. Deploy the approved commit to the existing Render service. Stop if build, startup, readiness, or `/api/version` commit identity differs from the approved SHA.
7. Run backend verification below with redacted evidence. Use uniquely named synthetic search data and do not delete or alter pre-existing records.
8. In the existing Netlify site, verify repository linkage, root `netlify.toml`, publish directory, and production `VITE_API_BASE_URL` pointing to the verified Render HTTPS origin without `/api`.
9. Deploy the same approved commit to the existing Netlify site. Verify deploy SHA, routing, API origin, and security headers before declaring release success.
10. If verification fails, stop new testing, retain request/deploy IDs, and use the hosting provider's existing-deploy rollback. Never restore the exposed credential or create duplicate services.

## Production verification checklist

### Mandatory owner gate

- [ ] Owner confirms revocation or rotation of the historically exposed MongoDB credential.
- [ ] Owner confirms database access activity and user permissions were reviewed.
- [ ] The active database user is least privilege and scoped to the intended database.

### Render and database

- [ ] Existing Render service points to the approved repository, branch, and commit.
- [ ] Build and start commands match `render.yaml`; health check is `/api/health/ready`.
- [ ] `/api/health` returns JSON, a request ID, and connected database state without sensitive details.
- [ ] `/api/health/ready` returns HTTP 200 before downstream testing.
- [ ] `/api/version` returns a non-null `commit` exactly matching the approved SHA.
- [ ] A missing optional `buildId` is accepted; if configured, it matches the expected non-secret label.
- [ ] Approved and rejected CORS origins behave as documented.

### Connectors and search

- [ ] Connector registry order, enabled state, authentication mode, and initial health are accurate.
- [ ] Each enabled connector completes a minimal permitted repository search and preserves source URLs.
- [ ] Provider failure and 403/429 behavior returns safe errors and rate-limit metadata.
- [ ] Fast and Deep preserve successful-source partial results when another source fails.
- [ ] All mode requires MongoDB and completes with durable results when storage is ready.
- [ ] Source selection sends work only to selected enabled connectors.
- [ ] Cancellation reaches `cancelled` and stops active provider work.
- [ ] Permanent failures cannot be retried; a deliberately retryable failure can be retried.

### Persistence, pagination, and exports

- [ ] A uniquely tagged synthetic job persists its job and repository result records.
- [ ] Restarting the existing API leaves the completed synthetic job and results readable.
- [ ] Cursor pages advance without missing or duplicate `(source, externalId)` identities.
- [ ] Retried results remain deduplicated by the existing unique identity.
- [ ] JSON and CSV exports contain the same complete persisted result set with valid escaping.
- [ ] Any synthetic cleanup uses an explicitly scoped identifier and leaves pre-existing data untouched.

### Netlify and frontend

- [ ] Existing Netlify site deploy SHA matches the approved commit.
- [ ] `/`, `/search`, and `/sources` load, and direct refresh preserves each SPA route.
- [ ] Frontend requests use the verified Render HTTPS origin and never localhost or an unintended service.
- [ ] Frame, MIME, referrer, permissions, and immutable-asset headers match `netlify.toml`.
- [ ] Fast, Deep, All, source selection, progress, partial results, cancellation, retry visibility, paging, and both exports work in the deployed UI.
- [ ] Browser console and network responses expose no credentials, connection strings, or production stacks.

### Release evidence

- [ ] Record commit SHA, existing-service deploy IDs, timestamps, request IDs, and redacted outcomes.
- [ ] Keep local automated evidence separate from post-deployment production evidence.
- [ ] Do not declare success until Render identity, database readiness, and Netlify deploy identity all agree.
