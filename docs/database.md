# Database Architecture

## Storage split

`rawItems` stores provider payloads needed for debugging/reprocessing, with retention metadata. `normalizedItems` stores the stable application model consumed by search, UI, analytics, saving, and AI context.

## Normalized item fields

- identity: `source`, `sourceId`, `sourceType`
- display: `title`, `description`, `url`
- public author summary
- nullable metrics: views, stars, forks, likes, comments, shares, watchers, open issues
- tags, language, source timestamps, `collectedAt`
- `rawDataReference`
- provenance: source URL, connector version, request/job ID
- provider-specific `metadata`

## Initial indexes

- unique `{ source: 1, sourceId: 1 }`
- `{ sourceType: 1, updatedAt: -1 }`
- `{ source: 1, collectedAt: -1 }`
- `{ tags: 1 }`, `{ programmingLanguage: 1 }`, `{ "author.username": 1 }`
- text index over title, description, and tags

Additional indexes require an observed query pattern. Canonical URL deduplication is handled conservatively because distinct provider records can legitimately share URLs.

The API field `language` is stored as `programmingLanguage` so it cannot be interpreted as MongoDB's text-index language override.

## Provenance and retention

Every normalized item records connector version, request/job identity, source URL, and collection time. Raw retention will be configurable. Deleting user notes/collections must not accidentally erase shared collected data; deleting collected source data must explicitly handle dependent saves and change events.

## Planned collections

`users`, `sources`, `sourceConfigs`, `collectionJobs`, `rawItems`, `normalizedItems`, `savedItems`, `collections`, `searchHistory`, `watchlists`, `changeEvents`, `tags`, `notes`, `connectorHealth`, `auditLogs`, `aiConversations`, and `aiMessages`.
