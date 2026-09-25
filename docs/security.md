# Security and Access Policy

## Collection policy

Collect only public or explicitly authorized information through official APIs or access methods that permit automation. Connectors must not bypass authentication, CAPTCHA, access controls, robots/access restrictions, platform rate limits, or terms.

## Secret handling

- Credentials are read only by backend configuration.
- Frontend bundles and API responses never contain provider tokens.
- Logs redact authorization, cookies, tokens, passwords, keys, and configured secrets.
- `.env` files are ignored; `.env.example` contains placeholders only.
- Connector and AI tokens never participate in cache keys or frontend environment variables.

The MongoDB credential previously committed in `.env.example` must be rotated in MongoDB Atlas. Removing it from the current tree does not revoke it or remove it from Git history; review the repository history and coordinate any history rewrite separately.

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
