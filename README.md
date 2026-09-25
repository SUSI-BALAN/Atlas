# Atlas Multi-Forge Research

Atlas is a local-first repository research application. It collects public or explicitly authorized repository metadata from GitHub, GitLab, Codeberg, Gitea.com, and Forgejo through their REST APIs, normalizes it, and keeps provenance links to the original sources.

## Run locally

Requirements: Node.js 20+ and MongoDB.

```powershell
npm.cmd install
npm.cmd run dev
```

The frontend defaults to `http://localhost:5173`; the API defaults to `http://127.0.0.1:4000`. The Vite `/api` proxy targets that same port. Copy `.env.example` to `.env` to enable additional connectors or configure backend-only tokens.

MongoDB is required for **All available results** mode. When MongoDB is unavailable, Atlas reports degraded storage and permits only bounded Fast/Deep jobs so an unbounded collection cannot accumulate in Node.js memory.

## Search modes

- Fast: collects up to 50 results.
- Deep: collects up to 500 results.
- All available results: sequentially consumes every accessible provider page, subject to provider caps, cancellation, and rate limits. No application-side result cap is applied.

Results are normalized and persisted one batch at a time, displayed through cursor pagination, and exportable as streaming JSON or CSV. GitHub search windows over 1,000 matches are recursively partitioned by creation date; a single-day partition can still be provider-limited and is reported honestly.

## Verification

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

See [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) for current implementation status and [docs/api.md](./docs/api.md) for API contracts.
