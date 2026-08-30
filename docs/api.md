# REST API Contracts

## Envelope

Success:

```json
{ "success": true, "data": {}, "meta": { "requestId": "..." } }
```

Failure:

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "Request validation failed", "details": [] },
  "meta": { "requestId": "..." }
}
```

Errors never expose secrets, authorization headers, internal stack traces, or complete unsafe provider payloads.

## POST /api/search

Request:

```json
{
  "query": "local AI coding agent",
  "sources": ["github"],
  "types": ["repository"],
  "filters": { "language": "TypeScript", "minStars": 10 },
  "sort": "relevance",
  "page": 1,
  "perPage": 20
}
```

Response data:

```json
{
  "status": "completed",
  "results": [],
  "sourceStatus": [
    { "source": "github", "status": "success", "resultCount": 0, "rateLimit": null }
  ],
  "pagination": { "page": 1, "perPage": 20, "returned": 0, "hasMore": false }
}
```

`status` is `completed`, `partially_completed`, or `failed`. A fully invalid request uses an HTTP 400 response; source failures are represented inside a valid search response. A complete upstream outage may use HTTP 502 when no source produces a usable result.

## Connector discovery

- `GET /api/connectors` returns public connector metadata, capabilities, health, and sanitized rate-limit state.
- `GET /api/connectors/:id` returns one connector or 404.

## Health

`GET /api/health` returns API status, database status, timestamp, and version. `200` means the API is serving; dependencies can still be marked degraded.

## Planned groups

Items, jobs, saved items, collections, watchlists, changes, analytics, export, AI, settings, and authentication will follow the same envelope and actor-aware service boundaries.
