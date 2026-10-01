# Changelog

## Stage 6 - Authentication and production hardening (local owner review)

- Added owner bootstrap/reset CLIs, scrypt password storage, hashed durable sessions, host-only cookies, CSRF, login/logout/me APIs, and secure-by-default application routing.
- Scoped search jobs, results, cache, legacy persistence, saved research, monitoring, analytics, and AI context to server-resolved workspaces; added an additive dry-run/apply migration.
- Added the same-origin Netlify API proxy, restrictive static CSP, frontend login/settings experience, security regression tests, and a release runbook. No production actions were performed.

## Stage 5 - Grounded AI research

- Replaced the AI placeholder with optional, durable, explicitly scoped Atlas research sessions.
- Added provider-neutral `none`, local, OpenAI, and DeepSeek adapters with server-only configuration, bounded timeouts, safe health/status, and usage metadata.
- Added allowlisted context building, citation validation, prompt-injection defenses, idempotent generation requests, and dedicated generation rate limiting.
- Added the accessible AI session/context/conversation UI and focused backend/frontend tests without live providers or production data.

## Stage 4 - Analytics and insights

- Replaced the Analytics placeholder with real persisted overview, source, language, saved-research, monitoring, and change-timeline metrics.
- Added a dedicated workspace-aware aggregation service and eight validated `/api/analytics` reports.
- Added bounded ISO date ranges, provider enums, deterministic distributions, explicit unknown-language handling, and safe empty/error behavior.
- Added accessible responsive text-backed charts and independent section caching/failure states without a chart dependency.
- Added focused backend and frontend analytics tests while preserving all Stage 0–3 suites.

## Stage 3 - Watchlists and changes

- Added durable watchlists, memberships, watch state, change events, and check runs.
- Added bounded manual/due checks, safe provider failures, overlap protection, new UI pages, saved integration, and dashboard counts.

All notable project changes are recorded here.

## Unreleased

### Added

- Stage 2 durable saved repositories and collections with safe snapshots, notes, tags, reference-only membership, search/detail integration, and workspace summary counts.

- Stage 1 durable search workflow: URL-restored jobs and result cursors, bounded cursor-paged search history, normalized job-scoped repository details, responsive state messaging, and conservative interrupted-job reconciliation with explicit retry.

- Durable asynchronous repository search jobs with progressive per-source status, cancellation, source retry, cursor-paged results, and backend-streamed JSON/CSV export.
- Uncapped all-available mode that consumes provider pages sequentially without an application-side result ceiling, while requiring MongoDB to avoid unbounded process memory.
- GitHub creation-date query partitioning for its 1,000-result search window, GitLab header pagination, and shared Gitea/Forgejo pagination for Codeberg, Gitea.com, and Forgejo.
- Search job, repository result, and TTL cache collections with batch upserts, source identity deduplication, and exact canonical URL duplicate detection.
- Accurate connector enablement/authentication/health/latency/rate-limit Sources UI and live multi-source search progress.
- Environment, pagination, retry, cancellation, progress, connector state, persistence-index, route, deduplication, and partial-failure tests using mocked providers.
- Corrected the storage verifier to load dotenv, use the `multi_forge` default, and report search-job persistence collections; normalized GitLab's source link and enabled-only availability count.

- M0 architecture baseline and project continuation context.
- Compliance-first connector and external-access rules.
- M1 TypeScript workspace, Express/MongoDB backend foundation, React/Vite dashboard, security middleware, health reporting, and environment validation.
- M2 connector contracts, capability/health/rate-limit models, typed errors, registry, and factory.
- M3 GitHub REST connector with repository/user/organization/issue/pull-request search and detailed repository/user/issue/pull-request/release/commit retrieval.
- Initial M4 unified search API and UI, controlled concurrency, partial failures, normalization, deduplication, ranking, raw/normalized persistence, and search history.
- Unit, API integration, and frontend component tests plus live GitHub/MongoDB verification.
- GitLab Projects API connector and reusable Gitea/Forgejo connector instances for Codeberg, Gitea.com, and Forgejo Next public repository search.
- Multi-source search controls, connector-specific status/count reporting, original-source links, and source registry metadata.
- Source-balanced ranking that interleaves matching providers while preserving each provider's ranked order.
- Progressive multi-page research collection with 20/50-result batches, accumulated deduplicated results, per-source totals, remaining-request visibility, and source-specific exhaustion.

### Fixed

- Hardened Stage 0 release verification with deploy identity reporting, honest pre-probe connector health, guarded source retries, search-job creation throttling, patched query parsing, Netlify security headers, and an evidence-based audit.
- Removed conflicting MongoDB upsert operators discovered during live persistence verification.
- Separated programming-language storage from MongoDB text-index language override semantics.
- Prevented unified pagination from silently skipping smaller-source records by allocating each global page across requested providers.
