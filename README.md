# Universal Internet Platform Information Collector

A local-first research application for collecting, normalizing, searching, and monitoring public or explicitly authorized information from internet platforms. GitHub is the reference connector; provider-specific behavior remains behind connector contracts.

## Status

Active milestone: M4 unified-search expansion. M0–M3 and the first GitHub search vertical slice are implemented. See [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) for the authoritative handoff state.

## Principles

- Use official APIs where available and respect authentication, access, and rate limits.
- Keep credentials on the backend and redact them from logs.
- Preserve provenance and never fabricate missing provider values.
- Return useful partial results when an individual connector fails.
- Keep collection, normalization, ranking, persistence, and presentation separate.

## Planned local commands

```bash
npm install
npm run dev
npm test
npm run build
```

Environment defaults are documented in `.env.example`. MongoDB is required for persistence; health and connector metadata remain observable when it is unavailable.

## Current working flow

1. Start MongoDB.
2. Optionally copy `.env.example` to `.env` and set a backend-only `GITHUB_TOKEN`.
3. Run `npm run dev`.
4. Open `http://localhost:5173/search` and search GitHub repositories, users, organizations, issues, or pull requests.

The API starts in explicit degraded mode if MongoDB is unavailable. Live GitHub search can still return provider data, while persistence failures remain logged.
