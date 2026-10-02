# Security and Access Policy

Stage 6 locally adds server-side login with versioned salted scrypt hashes, random hashed sessions, HttpOnly/SameSite=Strict host-only cookies (Secure in production), active-user/membership checks, session-bound CSRF, a dedicated login limiter, authenticated routing, and workspace-scoped searches through AI context. The frontend stores no bearer/session token and keeps CSRF only in memory. The static Netlify CSP disallows inline scripts, external connections, objects, and framing. Pino redacts cookie, authorization, and CSRF headers. The historical MongoDB credential still requires owner-led replacement/revocation before release; no production database or platform has been touched.

## Collection policy

Collect only public or explicitly authorized information through official APIs or access methods that permit automation. Connectors must not bypass authentication, CAPTCHA, access controls, robots/access restrictions, platform rate limits, or terms.

## Secret handling

- Credentials are read only by backend configuration.
- Frontend bundles and API responses never contain provider tokens.
- Logs redact authorization, cookies, tokens, passwords, keys, and configured secrets.
- `.env` files are ignored; the current local `.env.example` uses a synthetic localhost-only MongoDB URI and empty provider-secret placeholders.
- Connector and AI tokens never participate in cache keys or frontend environment variables.

## Credential incident status

- **Current tracked-file exposure:** `.env.example` uses a synthetic localhost-only URI and empty secret placeholders. Historical exposure is not cured by removing the value from current source.
- **Historical Git exposure:** the credential-bearing value remains in repository history. Do not reproduce or use it, and do not rewrite history without explicit owner approval and coordination.
- **Owner-confirmed revocation:** treat the credential as compromised until the owner confirms revocation or rotation and completes an access review. Stage 0 does not claim that either action has occurred.
- **Local remediation:** redacted scanning must confirm that current public files and generated build output contain no credential-bearing URI before commit approval.
- **Production verification:** verify only credential names, release identity, health, and redacted behavior through the approved production checklist. Never test the historical credential or disclose the replacement secret.

## Request protection

- Validate inputs and cap strings, arrays, pagination, payloads, and concurrency.
- Configure explicit CORS origins, Helmet headers, API rate limits, and JSON body limits.
- Apply outbound timeouts and abort propagation.
- Keep all-results collection behind durable storage, bounded connector concurrency, and sequential per-connector pagination.
- Return safe error details with request IDs.

## External URL / SSRF policy

Before a future website connector ships, it must:

1. Permit only HTTP(S) and reject userinfo or ambiguous host representations.
2. Resolve DNS and reject loopback, private, link-local, multicast, reserved, and cloud metadata destinations for IPv4 and IPv6.
3. Revalidate every redirect destination and cap redirects.
4. Prevent DNS rebinding by connecting only to validated resolution results or using equivalent network enforcement.
5. Enforce content-type allowlists, response byte limits, and total/connect timeouts.
6. Never act as a generic proxy and never forward caller credentials to arbitrary hosts.

Local/internal URL access, if ever added, must be a separate trusted-administration feature disabled by default.

## Privacy

Persist only fields needed for research. Distinguish public source data, private user notes, and secrets. Provide explicit retention/deletion controls in the relevant milestone. Public availability does not justify unnecessary personal-data collection.

## AI boundary

AI is disabled by default. Provider keys/configuration remain backend-only. External providers receive only selected, allowlisted Atlas context; saved notes, source metadata, raw payloads, logs, headers, environment variables, filesystem paths, and unrelated records are excluded. Fixed server instructions treat repository and user text as untrusted data and prohibit following embedded instructions, browsing, URL fetching, tools, execution, secret disclosure, or external actions. Logs contain safe identifiers, classifications, timing, grounding, and token counts—not prompts or answers.

The validated backend-only `AI_MAX_OUTPUT_TOKENS` setting bounds provider generation (128–4,096; default 1,200) through each supported request protocol. The existing post-response character cap remains in effect. Custom local services may ignore Ollama's `options.num_predict`; this limitation is documented in the Stage 5 guide.

Citation IDs are accepted only when present in the supplied context. Unknown IDs are discarded, and a response containing any unknown citation is marked not fully grounded. AI history is shared within the authenticated workspace, not private to a user.
`AI_PROVIDER=none` remains a supported release mode. Search, saved research, collections, watchlists, analytics, and authentication do not depend on an AI provider. Release verification must treat an optional provider outage as an AI-only degradation and must never log full prompts or provider credentials.

## Stage 7 operational verification

The release verifier accepts only an explicit HTTP(S) origin, bounds redirects/timeouts, performs read-only checks by default, and reports cookie attributes without values. Hosted HTTPS verification requires HSTS, CSP with `frame-ancestors`, nosniff, and a referrer policy. Local HTTP does not fail solely for missing HSTS. Record mutations are not part of the default smoke test.

Index verification is read-only and migration remains the only schema/index transition owner. Production backup existence, hosted proxy behavior, trust-proxy semantics, cookies, and workspace A/B isolation require separately authorized evidence; local configuration cannot prove them.
