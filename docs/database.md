# Database Architecture

MongoDB remains the persistence system. All-results jobs process a page at a time and do not retain the complete result set in process memory.

## Search collections

- `search_jobs`: request, status, cancellation flag, total, request ID, and durable per-source page/partition/rate-limit/error progress. Indexed by status and creation time.
- `repository_results`: normalized repository records. Unique index `{ jobId, source, externalId }`; cursor and stars indexes support paging. `canonicalUrl` and `duplicateUrlOf` detect exact URL mirrors while preserving every provider record and legitimate forks.
- `search_cache`: deterministic token-free request key, completed job reference, and TTL expiry using `SEARCH_CACHE_TTL_SECONDS`.

Each connector batch uses unordered `bulkWrite` upserts. The response model contains source-neutral repository fields; provider-only details live in `sourceMetadata`.

The earlier `rawItems`, `normalizedItems`, and `searchHistory` collections remain for the legacy synchronous/mixed-content search API. They are not deleted or replaced.
