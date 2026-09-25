# Connector Development Guide

Repository connectors implement one source-neutral contract: configuration validation, health/rate-limit status, normalization, and `searchRepositories()` as an `AsyncGenerator<RepositorySearchBatch>`. Each yielded page is persisted before the next page is fetched.

All connectors must use official/public APIs, backend-only optional tokens, an abort signal, response validation, explicit timeouts, bounded retries, and sanitized structured logs. Permanent 4xx errors are not retried. Retryable network/timeouts, 429, and selected 5xx responses use exponential backoff with jitter and provider reset/retry timing.

## Providers

- GitHub uses `GITHUB_API_URL` and a maximum page size of 100. It reads search/rate-limit headers. All mode recursively partitions creation-date ranges when a search window reports more than GitHub's accessible 1,000 matches. A still-oversized one-day range is flagged `providerLimited`; Atlas does not claim to bypass it.
- GitLab uses `/api/v4/projects`, page size 100, and `X-Next-Page`/total pagination metadata where supplied.
- Codeberg, Gitea.com, and Forgejo use separate instances of one reusable Gitea/Forgejo adapter against `/api/v1/repos/search`. Pages are fetched sequentially until the provider reports no next page or returns an exhausted page.

Provider-supported query, owner/topic, sorting, and filters are forwarded. Where a Forge API does not support a filter, it is applied conservatively to each returned page and documented in the connector implementation. Provider response shapes never reach frontend components.

Disabled connectors remain registered for honest Sources-page visibility, but are excluded from `sources: "all"` and cannot execute a search.
