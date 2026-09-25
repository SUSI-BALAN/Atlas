# Changelog

All notable project changes are recorded here.

## Unreleased

### Added

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

- Removed conflicting MongoDB upsert operators discovered during live persistence verification.
- Separated programming-language storage from MongoDB text-index language override semantics.
- Prevented unified pagination from silently skipping smaller-source records by allocating each global page across requested providers.
