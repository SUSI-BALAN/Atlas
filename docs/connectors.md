# Connector Development Guide

## Contract

Each connector declares:

- stable `id`, display `name`, semantic `version`
- capability flags
- `validateConfig()`
- `search()`
- supported `fetchItem()` / `fetchUpdates()` methods
- `normalize()` or an internal mapper returning shared normalized items
- `getRateLimitStatus()` and `getHealth()`

Unsupported methods return a typed capability error; they do not silently return empty data.

## Required behavior

- Use an official API where available.
- Accept an abort signal and enforce a timeout.
- Bound pagination and page size.
- Validate provider responses at the trust boundary.
- Preserve provider identifiers and source URLs.
- Never synthesize absent fields.
- Classify retryable versus permanent errors.
- Expose rate-limit/reset/retry-after metadata when the provider supplies it.
- Redact credentials and authorization values from errors/logs.

## Error taxonomy

`authentication`, `authorization`, `validation`, `not_found`, `rate_limited`, `timeout`, `network`, `provider`, `malformed_response`, `disabled`, and `unsupported_capability`.

Only timeout, transient network/provider failures, and provider-approved rate-limit retries are retry candidates. Authentication, authorization, invalid request, and not-found errors are permanent for that request.

## New connector checklist

Document name/platform, access method, authentication, capabilities, search/detail behavior, pagination, rate limits, raw shape, normalization, errors, retries, cache policy, tests, and compliance notes. Register the connector in composition code; core orchestration must not otherwise change.

## GitHub reference

The GitHub connector uses the official REST API, optional backend token, explicit API version header, bounded pagination, and response headers for rate-limit state. Repository search is the first end-to-end capability. Repository subresources are fetched only when explicitly requested.
