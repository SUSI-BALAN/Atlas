# Changelog

All notable project changes are recorded here.

## Unreleased

### Added

- M0 architecture baseline and project continuation context.
- Compliance-first connector and external-access rules.
- M1 TypeScript workspace, Express/MongoDB backend foundation, React/Vite dashboard, security middleware, health reporting, and environment validation.
- M2 connector contracts, capability/health/rate-limit models, typed errors, registry, and factory.
- M3 GitHub REST connector with repository/user/organization/issue/pull-request search and detailed repository/user/issue/pull-request/release/commit retrieval.
- Initial M4 unified search API and UI, controlled concurrency, partial failures, normalization, deduplication, ranking, raw/normalized persistence, and search history.
- Unit, API integration, and frontend component tests plus live GitHub/MongoDB verification.

### Fixed

- Removed conflicting MongoDB upsert operators discovered during live persistence verification.
- Separated programming-language storage from MongoDB text-index language override semantics.
