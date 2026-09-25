# Atlas Multi-Forge Research

Atlas is a local-first repository research application. It collects public or explicitly authorized repository metadata from GitHub, GitLab, Codeberg, Gitea.com, and Forgejo through their REST APIs, normalizes it, and keeps provenance links to the original sources.

## Run locally

Requirements: Node.js 20+ and MongoDB.

```powershell
npm.cmd install
npm.cmd run dev
```

The frontend runs at `http://localhost:5175`; the API defaults to `http://127.0.0.1:4000`. The Vite `/api` proxy targets that same API port. Copy `.env.example` to `backend/.env` to enable additional connectors or configure backend-only tokens. Leave `frontend/.env` without `VITE_API_BASE_URL` for local proxy mode; set `VITE_API_BASE_URL` to the deployed backend origin in Netlify production.

Production uses the root `netlify.toml` for the frontend build and SPA fallback, and `render.yaml` for an independently deployed Express service. Set `MONGODB_URI` and optional connector tokens only in Render. Set `VITE_API_BASE_URL` in Netlify to the verified Render service origin before building the production frontend.

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
