# Database Architecture

Stage 6 adds `users`, `workspaces`, `workspace_memberships`, and `auth_sessions` (hashed token, CSRF hash, expiry TTL, revocation). Query-backed unique indexes cover normalized email, workspace key, membership identity, one owner per workspace, and session-token hash. Session lookup rechecks expiry, revocation, active user, workspace, and membership before returning research data.

Search jobs, repository results, cache, and legacy raw/normalized/history records now store `workspaceKey`. Search history uses `{workspaceKey,createdAt,_id}`, results use `{workspaceKey,jobId,_id}`, cache uses unique `{workspaceKey,cacheKey}` plus TTL, and legacy normalized identity uses unique `{workspaceKey,source,sourceId}`. The additive migration backfills only missing keys to `default`, preserving IDs; it explicitly replaces the older single-key unique cache and normalized indexes after backfill. Stage 4 analytics now starts every search/result query with the same workspace match. See the Stage 6 guide for ordering and rollback constraints.

Stage 3 adds `watchlists`, `watchlist_memberships`, `repository_watch_states`, `change_events`, and `watch_check_runs`. Stage 6 requires explicit workspace ownership resolved from authenticated server sessions and memberships; these schemas no longer default ownership to `default`. Historical records already assigned to `default` remain there, and missing keys are backfilled only by the explicit migration. Compound unique and time/ObjectId indexes support membership integrity, due selection, stable pagination, overlap protection, and event idempotency. Cascades are application-level; consistency windows are documented in the Stage 3 guide.

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

## Analytics query support

Stage 4 reads existing persisted collections directly and creates no analytics snapshot collection. It adds two indexes tied to implemented filters:

- `change_events`: `{ workspaceKey: 1, source: 1, detectedAt: -1 }` supports source-filtered date-range reports; the existing workspace/date index supports unfiltered timelines.
- `watch_check_runs`: `{ workspaceKey: 1, status: 1, createdAt: -1 }` supports status/time monitoring aggregation.

Saved, collection, membership, and watchlist analytics reuse their existing workspace indexes. Collection/watchlist lists are capped at 25 and use aggregation lookups rather than N+1 reads. Stage 6 adds workspace ownership to search jobs and repository results, so their analytics use the same boundary.

## AI research collections

- `ai_research_sessions`: title and context references. `{ workspaceKey: 1, updatedAt: -1, _id: -1 }` supports stable history.
- `ai_research_messages`: user/assistant content, validated citations, safe provider/model/usage metadata, and grounding/generation state. `{ workspaceKey: 1, sessionId: 1, createdAt: 1, _id: 1 }` supports history. Unique partial indexes on `clientRequestId` and `inReplyTo` prevent duplicate requests and replies.

Sessions do not copy source datasets. Messages never store system instructions, raw provider requests/responses, hidden reasoning, credentials, saved notes, or raw provider metadata. Deletion is application-level: deleting the session before messages can leave orphan AI messages if the second write fails without transactions. Assistant insertion and user completion are also separate writes; the unique reply index prevents a second assistant reply, while reconciliation remains future work.
