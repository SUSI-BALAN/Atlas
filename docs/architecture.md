# Architecture

The source-neutral watch service loads saved identities, calls connector `fetchItem`, creates an allowlisted snapshot, invokes the pure detector, and persists state/events/runs. HTTP routes and the run-once worker share it; Express has no polling timer.

## System boundary

The application aggregates public or explicitly authorized information through official or otherwise permitted interfaces. Provider access is an adapter concern; core search and research workflows operate on normalized records.

```text
Browser -> Search job API -> bounded connector scheduler
                              |-> GitHub REST API
                              |-> GitLab Projects API
                              |-> shared Gitea/Forgejo API adapter
                           page batch -> normalize -> identity/URL detection
                                      -> MongoDB bulk upsert -> paged UI/export
```

The browser selects jobs through `/search?job=<jobId>` and optionally preserves the current result cursor in the query string. Repository detail routes carry only validated job/result identifiers; provider tokens, API origins, and request state never enter navigation URLs.

## Layer rules

1. Routes validate transport input and format response envelopes.
2. Application services orchestrate use cases and depend on connector/repository interfaces.
3. Connectors own provider authentication, pagination, response validation, mapping, errors, and rate-limit data.
4. Repositories own persistence details.
5. The frontend imports its own API-facing types, never provider response types.

## Search lifecycle

1. Validate and cap the query, requested sources, filters, sort, and pagination.
2. Resolve enabled connectors advertising search capability.
3. Create a durable job and execute enabled connectors with configured bounded concurrency.
4. Fetch one provider page sequentially per connector with timeouts and cancellable exponential backoff.
5. Normalize without inventing missing values, deduplicate `(source, externalId)`, and detect canonical URL duplicates without discarding forks.
6. Bulk upsert the batch, update durable source progress, and make it immediately available to cursor-paged UI and streaming exports.
7. Continue until exhausted, explicitly limited by a provider, cancelled, or failed. Independent sources continue after a partial failure.

## Restart reconciliation

The connector scheduler remains process-local. Once MongoDB connects at API startup, Atlas finds jobs in `queued`, `running`, or `rate_limited` and applies a conservative transition:

1. Never issue provider requests automatically.
2. Preserve all `repository_results`, totals, and source cursors.
3. Mark each nonterminal source `failed` with retryable `PROCESS_INTERRUPTED`.
4. Mark the job `partially_complete` if any source already completed; otherwise mark it `failed`.
5. Let the user explicitly retry a source. Linear cursors resume after the last durable page; identity upserts protect providers that must revisit work.

## Runtime decisions

- Search documents and results are durable, while active scheduling remains owned by the local API process. Startup reconciliation exposes interrupted work safely instead of automatically replaying it.
- MongoDB failure produces explicit degraded health. Bounded preview/deep jobs use a bounded in-process fallback; all-results jobs require MongoDB.
- Request IDs flow through logs, raw records, normalized provenance, and job/source status.
- Connector IDs and standardized source types are stable serialized identifiers.

## Evolution points

Stage 4 introduces a dedicated analytics service between Express routes and Mongoose models. Routes validate bounded dates, limits, and provider enums; the service owns aggregation pipelines and returns source-neutral DTOs. Workspace-owned pipelines match `workspaceKey: "default"` before lookup/group stages, while legacy search/result analytics explicitly describe the shared Atlas dataset. The frontend requests sections independently so an optional report failure does not make the page unusable.

Stage 2 places saved repositories, collections, and membership behind a workspace service boundary. Saves copy only allowlisted normalized fields from job-scoped persisted results. Collections use join records rather than embedding repository documents. `workspaceKey: "default"` is an explicit future ownership partition, not a privacy claim.

- Search repository can be replaced by Meilisearch/OpenSearch/Elasticsearch indexing.
- Scheduler ownership can move to BullMQ/Redis for multi-process execution and automatic restart recovery without changing REST contracts.
- AI providers implement a separate optional interface and consume cited normalized items.
- Authentication middleware can add users/teams without changing connector contracts.
