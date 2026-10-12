# Stage 3: watchlists and repository changes

Stage 3 monitors saved repositories in the unauthenticated `default` workspace. Watchlists are workspace-wide, not private or user-owned. Production release remains blocked by the separately documented historical MongoDB credential and unauthenticated write boundary.

## Durable records

- `watchlists`: bounded name/description, enabled state, 15–10,080 minute interval, and last/next check timestamps.
- `watchlist_memberships`: unique `(workspaceKey, watchlistId, savedId)` links; saved repositories may belong to many watchlists.
- `repository_watch_states`: one current allowlisted snapshot and fingerprint per membership plus success/failure health.
- `change_events`: factual transitions linked to a run; `(workspaceKey, checkRunId, savedId)` is idempotent.
- `watch_check_runs`: durable status/counts. A partial unique active-run index prevents overlap per watchlist.

Deleting a watchlist removes memberships/current state but preserves saved repositories and historical evidence. Unsaving removes collection/watchlist memberships and current watch state.

## Snapshots and changes

Only `stars`, `forks`, `watchers`, `openIssues`, `defaultBranch`, `language`, `license`, `archived`, `visibility`, `description`, `topics`, `sourceUpdatedAt`, and `pushedAt` are stored. Raw responses, headers, tokens, and arbitrary provider metadata are excluded. Topics are trimmed, deduplicated, and sorted before SHA-256 hashing and comparison.

The first success establishes a baseline and creates no event. Later successes compare against the last valid baseline. Failed, rate-limited, malformed, or unavailable requests never replace a baseline or create a change. Verified not-found is retained as safe `not_found` health; it does not delete or infer deletion. Availability events are deferred.

## Fetching, failures, and runs

Checks use direct connector `fetchItem`: GitHub and Gitea/Forgejo use owner/name; GitLab uses stable project ID. There is no search fallback. Safe classifications include disabled, authentication, authorization, rate-limited, timeout/network, validation/malformed, not-found, and provider failure.

Repository concurrency is bounded by `WATCH_CHECK_CONCURRENCY` (default 3, range 1–10). Failures are isolated and runs report checked/changed/unchanged/failed/rate-limited counts. Manual `POST /api/watchlists/:id/check` is rate limited, accepts no URLs, and returns 409 for an active run.

## Scheduler architecture

There is no production timer. `npm run watch:run` connects to MongoDB, selects at most `WATCH_MAX_WATCHLISTS_PER_RUN` due enabled watchlists (default 10, range 1–100), processes them once, advances `nextCheckAt`, disconnects, and exits. A future trusted scheduler may invoke it; Stage 3 provisions no Render/Netlify/production scheduler.

## Integrity limits

State is upserted and event insertion is idempotent per run/target. No replica-set transaction is silently required. A crash between event insertion and state update can leave the old baseline with a valid event; cleanup cascades can be partially applied until retried; a crash after fetching but before persistence causes a later recheck. Abruptly abandoned active runs require operational reconciliation; automatic stale-lock expiry is deferred because worker liveness cannot be inferred safely.

## Stage 4 handoff

Stage 4 may consume factual events only after approval. Authentication, collaborative ownership, notifications, AI, analytics, and scheduler provisioning remain out of scope.
