# Architecture

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

## Runtime decisions

- Search documents and results are durable, while active scheduling remains owned by the local API process. A process restart does not yet automatically re-enqueue interrupted jobs.
- MongoDB failure produces explicit degraded health. Bounded preview/deep jobs use a bounded in-process fallback; all-results jobs require MongoDB.
- Request IDs flow through logs, raw records, normalized provenance, and job/source status.
- Connector IDs and standardized source types are stable serialized identifiers.

## Evolution points

- Search repository can be replaced by Meilisearch/OpenSearch/Elasticsearch indexing.
- Scheduler ownership can move to BullMQ/Redis for multi-process execution and automatic restart recovery without changing REST contracts.
- AI providers implement a separate optional interface and consume cited normalized items.
- Authentication middleware can add users/teams without changing connector contracts.
