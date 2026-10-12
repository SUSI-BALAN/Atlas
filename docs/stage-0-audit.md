# Stage 0 Audit and Hardening

Audit date: 2026-09-28. Baseline commit: `8b3633755e3555b96761de8733fd4d6f720898a7` on `main`. Work was completed on `stage0-audit-hardening` without pushing or deploying.

## Evidence boundaries

Verified findings below come from the fetched repository, executed local checks, or read-only HTTP requests to the documented production origins. Items marked **unverified** require a production mutation, hosting-account metadata, or secret-bearing database access and are not inferred from health responses.

## Current-state feature matrix

| Area | Local implementation | Production evidence | Roadmap stage |
| --- | --- | --- | --- |
| SPA routes | Overview, search, sources, and placeholder future routes | `/`, `/search`, and `/sources` returned Netlify HTML with HTTP 200 | Stage 0 complete |
| API health | Dependency-aware liveness and MongoDB readiness | `/api/health` healthy and `/api/health/ready` ready with database connected | Stage 0 complete |
| Release identity | `/api/version` reports application, build, and Render commit fields | **Unverified until deployment** | Stage 0 local complete |
| CORS and headers | Explicit frontend origins, Helmet, request IDs, body and request limits | Allowed origin returned for `https://atlaslaber.netlify.app`; static headers require deployment | Stage 0 local complete |
| Connectors | GitHub, GitLab, Codeberg, Gitea.com, and Forgejo adapters | Registry returned all five enabled; provider reachability was not probed by the registry response | Stage 0 integration tests present; live searches unverified |
| Search jobs | Fast, Deep, All, progress, cancellation, source retry, paging, JSON/CSV export | **Unverified in production** to avoid writes and provider quota use | Stage 1 foundation present |
| Persistence | MongoDB job, result, cache, history, raw, and normalized models | Readiness proves connectivity, not collection contents or durable workflow correctness | Stage 1 foundation present |
| Saved research | Placeholder routes only | Not implemented | Stage 2 |
| Watchlists and change detection | Placeholder routes only | Not implemented | Stage 3 |
| Analytics | Placeholder route only | Not implemented | Stage 4 |
| AI research | Configuration only; collection works with AI disabled | Not implemented | Stage 5 |
| Settings/accessibility/CI | Placeholder settings route; component tests exist | CI workflow not present | Stage 6 |

## Read-only production observations

| Check | Observed result on 2026-09-28 |
| --- | --- |
| Frontend routes | `/`, `/search`, and `/sources` returned HTTP 200 and the same SPA document |
| Backend liveness | `/api/health` returned HTTP 200 with `status=healthy`, `database=connected`, and a request ID |
| Backend readiness | `/api/health/ready` returned HTTP 200 with `status=ready` |
| Allowed CORS | Health request from `https://atlaslaber.netlify.app` received the matching allow-origin header |
| Rejected CORS | Health request from `https://example.invalid` received no allow-origin header |
| Connector registry | `/api/connectors` returned HTTP 200 with five enabled connectors; this did not call the providers |
| Release identity | `/api/version` returned HTTP 404 because the Stage 0 endpoint is not deployed |
| Static headers | Current Netlify root response omitted the Stage 0 frame, MIME, and referrer headers |

## Prioritized findings

### High

1. At the start of Stage 0, the tracked `.env.example` contained a credential-bearing MongoDB URI. Redacted history scanning found the credentialed-URI pattern in that file across five reachable commits, including the current baseline commit. The local working tree now contains only a synthetic localhost example. That remediation does not revoke the exposed credential or remove it from Git history. Owner-confirmed revocation and a MongoDB access review remain release blockers; no rotation or history rewrite was performed.
2. Search-job creation is unauthenticated and can initiate costly provider and database work. Stage 0 adds a narrow 20-per-15-minute creation limit. Authentication, ownership, and per-user quotas remain a Stage 2 prerequisite before private research data is introduced.

### Medium

1. Source retry previously accepted completed, running, cancelled, and permanent-failure states, which could duplicate provider work. The service and UI now allow only rate-limited or explicitly retryable failures.
2. Connectors initially reported `healthy` before any provider request. They now report `unavailable` with a not-yet-checked message until a real request succeeds.
3. The production dependency tree resolved vulnerable `qs@6.15.3` through Express. An exact backend dependency pins and deduplicates the patched `6.16.0` release.
4. The backend had no deployed commit identity endpoint. `/api/version` now reports `RENDER_GIT_COMMIT` and a non-secret build label when configured.

### Low

1. Netlify lacked explicit clickjacking, MIME-sniffing, referrer, permissions, and immutable asset-cache headers. These are now defined locally.
2. The production runbook referenced the retired `atlashu.netlify.app` origin. It now uses `atlaslaber.netlify.app`.

## Assumptions and blockers

- The Render service is assumed to be built from this repository because the public origin was supplied for this project; account-side repository, branch, deploy ID, and commit metadata were not available through the read-only HTTP surface.
- Production connector success, job persistence, result identity, export parity, cancellation, retry, restart durability, and MongoDB least-privilege permissions remain unverified.
- **Current tracked-file exposure:** remediated only in the uncommitted local working tree by replacing the URI with a localhost-only example.
- **Historical Git exposure:** still present in repository history; no automatic history rewrite was attempted.
- **Owner action:** the exposed credential must be treated as compromised until the owner confirms revocation or rotation and reviews database access activity.
- **Production verification:** this audit does not inspect production secret values or use database credentials; deployment verification remains a separate, approval-gated activity.

## Local validation evidence

Executed locally on 2026-09-28 after remediation:

| Check | Result |
| --- | --- |
| TypeScript typecheck | Passed for backend and frontend |
| Backend tests | 24 files passed; 50 tests passed |
| Frontend tests | 5 files passed; 11 tests passed |
| Production builds | Backend TypeScript build and frontend Vite build passed |
| Production dependency audit | `npm audit --omit=dev` reported 0 vulnerabilities |
| Patch validation | `git diff --check` passed; only Git line-ending notices were emitted |
| Credential-pattern scan | 124 public working-tree files and 107 generated build files scanned; 0 redacted matches |

Focused regression coverage includes asynchronous partial completion, non-overlapping cursor pages, JSON/CSV export parity across multiple pages, retry deduplication plus the MongoDB unique-index invariant, production-style trusted-proxy limiting, optional build identity, required Render commit identity semantics, and Netlify security-header configuration. The retry test uses isolated in-process storage behavior and validates the persisted schema invariant; it does not start MongoDB or access production data.

These are local automated results only. The read-only production observations above were collected before these uncommitted changes and do not verify the remediated build. No deployment, production database access, credential rotation, or post-deployment smoke test was performed during local remediation.

## Stage 1 proposal

1. Add a persistent job-history endpoint and search-history view with explicit retention controls.
2. Reconcile `queued` and `running` jobs on startup: safely resume supported linear cursors and mark non-resumable work interrupted with a retry action.
3. Make result sorting and filtering server-side and cursor-stable; preserve the existing result envelope and default `_id` cursor behavior for compatibility.
4. Add a repository detail route using persisted normalized data first, with explicit on-demand provider refresh.
5. Improve empty, interrupted, rate-limited, and stale-cache states without hiding partial results.

Acceptance criteria:

- Restarting the API never leaves a job permanently presented as actively running.
- History survives restart, paginates deterministically, and exposes deletion/retention behavior.
- Sorting and filters return stable non-duplicated pages and retain source provenance.
- Repository detail links work for every connector without exposing provider payloads or tokens.
- Backend route/service tests and frontend interaction tests cover success, partial failure, restart recovery, empty data, and pagination.
- Production verification records matching backend commit identity before release approval.
