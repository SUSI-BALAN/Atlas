# Architecture

## System boundary

The application aggregates public or explicitly authorized information through official or otherwise permitted interfaces. Provider access is an adapter concern; core search and research workflows operate on normalized records.

```text
Browser -> REST API -> Search Orchestrator -> Connector Registry
                                      |-> GitHub connector -> GitHub REST API
                                      |-> future connectors
                         -> raw storage -> normalization/deduplication
                         -> normalized storage -> ranked response
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
3. Execute with bounded concurrency and independent timeouts.
4. Capture raw provider records with request/job provenance when persistence is healthy.
5. Normalize without inventing missing values.
6. Deduplicate first by `(source, sourceId)`, then exact canonical URL.
7. Rank using type/source-aware normalized signals.
8. Upsert normalized records and search history.
9. Return results with per-source status; one provider failure does not erase other results.

## Runtime decisions

- API process remains stateless except for local scheduler ownership in the MVP.
- MongoDB failure produces explicit degraded health; searches may still return live provider data if configured to tolerate persistence failure.
- Request IDs flow through logs, raw records, normalized provenance, and job/source status.
- Connector IDs and standardized source types are stable serialized identifiers.

## Evolution points

- Search repository can be replaced by Meilisearch/OpenSearch/Elasticsearch indexing.
- Scheduler and jobs can move to BullMQ/Redis.
- AI providers implement a separate optional interface and consume cited normalized items.
- Authentication middleware can add users/teams without changing connector contracts.
