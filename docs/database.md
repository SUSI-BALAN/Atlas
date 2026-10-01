# Database Architecture

Stage 3 adds `watchlists`, `watchlist_memberships`, `repository_watch_states`, `change_events`, and `watch_check_runs`, all scoped by `workspaceKey: "default"`. Compound unique and time/ObjectId indexes support membership integrity, due selection, stable pagination, overlap protection, and event idempotency. Cascades are application-level; consistency windows are documented in the Stage 3 guide.

MongoDB remains the persistence system. All-results jobs process a page at a time and do not retain the complete result set in process memory.

## Search collections

- `search_jobs`: request, status, cancellation flag, total, request ID, and durable per-source page/partition/rate-limit/error progress. Indexed by status and compound descending `{ createdAt, _id }` for deterministic history traversal.
- `repository_results`: normalized repository records. Unique index `{ jobId, source, externalId }`; cursor and stars indexes support paging. `canonicalUrl` and `duplicateUrlOf` detect exact URL mirrors while preserving every provider record and legitimate forks.
- `search_cache`: deterministic token-free request key, completed job reference, and TTL expiry using `SEARCH_CACHE_TTL_SECONDS`.

Each connector batch uses unordered `bulkWrite` upserts. The response model contains source-neutral repository fields; provider-only details live in `sourceMetadata`.

The repository detail response allowlists safe public metadata and omits stored provenance/request identifiers. Detail lookup always matches both `_id` and `jobId`, preventing a repository identifier from being reused across jobs.

The earlier `rawItems`, `normalizedItems`, and `searchHistory` collections remain for the legacy synchronous/mixed-content search API. They are not deleted or replaced.

## Saved research collections

- `saved_repositories`: safe normalized snapshot, plain-text note, tags, and originating job/result reference. Unique `{ workspaceKey, source, externalId }`; indexed for creation pagination, tags, and language.
- `collections`: bounded name/description with workspace and creation indexes.
- `collection_memberships`: reference-only join rows. Unique `{ workspaceKey, collectionId, savedId }` prevents duplicates; the reverse index supports cleanup.

Unsave removes memberships. Deleting a collection removes memberships but never saved repositories. The constant workspace partition can become an authenticated owner/team key later.
