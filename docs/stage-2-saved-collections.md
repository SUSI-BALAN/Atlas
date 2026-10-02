# Stage 2 Saved Repositories and Collections

## Implemented behavior

Atlas saves normalized repositories from persisted search results, detects saved state, unsaves, edits plain-text notes, normalizes tags, and reopens source provenance. Collections group saved repository IDs without duplicating repository documents.

## Persistence and indexes

`saved_repositories` stores a safe snapshot, `workspaceKey`, source identity, note/tags, and originating job/result IDs. Unique workspace/source/external identity makes saving idempotent. `collections` stores bounded names/descriptions. `collection_memberships` is a unique reference-only join collection. Creation, tag, language, collection, and reverse-membership indexes support bounded queries and cleanup.

## API

The `/api/saved` and `/api/collections` contracts are documented in `docs/api.md`. IDs and strings use Zod validation and page limits are capped at 50. Clients cannot submit provider metadata when saving.

## Workspace limitation and evolution

Authentication is not implemented. All saved data is workspace-wide and must not be treated as user-private. The explicit workspace partition can later be replaced with an authenticated owner/team identifier without changing repository identity or membership structure.

## Test evidence

Automated tests cover trusted-reference save, unique upserts, lookup, unsave cleanup, pagination/input bounds, note/tag normalization, collection create/update/deletion isolation, membership idempotency, Save/Saved UI integration, page states, and dashboard counts. Production MongoDB and live providers are not used.

## Known limitations

- Text filtering uses bounded MongoDB regular expressions instead of a dedicated search index.
- Collection counts use simple per-collection count queries for the current local workspace scale.
- Saved snapshots do not automatically refresh from providers.

## Stage 3 handoff

Watchlists are intentionally not implemented. Stage 3 may reference saved IDs, but must define ownership, schedules, provider budgets, change snapshots, and deletion semantics independently of collection membership.
