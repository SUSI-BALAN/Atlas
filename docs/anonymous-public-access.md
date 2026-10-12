# Anonymous public access rollout

Atlas creates an opaque, server-owned guest identity when a visitor first opens the application. The browser receives only an HttpOnly session cookie. The random guest workspace key is never accepted from, or returned to, the guest client. Existing authenticated users, memberships, workspaces, sessions, and records retain their original behavior and ownership.

## Data lifecycle

Guest session expiry and guest-data deletion are deliberately separate:

- `auth_sessions.expiresAt` ends access and is covered by the existing TTL index.
- `guest_workspaces.cleanupEligibleAt` records the earliest retention boundary.
- `guest_workspaces.cleanupStatus` defaults to `retained`. Nothing in application startup changes it or deletes guest data.
- A future cleanup tool must require an explicit approved workspace allowlist, require `cleanupStatus: approved`, recheck the `guest_` prefix, operate in bounded batches, and provide a dry run. No such cleanup is run by this change.

Losing or clearing the session cookie makes anonymous data unavailable. Guest data does not transfer between browsers or devices.

## Persistent quotas

Guest writes, search creation, watch checks, and AI generation use atomic counters in `operation_quotas`. Search creation also checks a configurable per-workspace active-job ceiling. Quota storage failure rejects the operation; it does not fall back to an in-memory or shared counter. Authenticated owner sessions retain their existing behavior. The general and endpoint IP limits remain an outer abuse-control layer.

## Staged deployment and rollback

1. Deploy database indexes for `guest_workspaces` and `operation_quotas` as an explicit reviewed database step. Do not run a data rewrite.
2. Deploy the compatible backend. It continues to accept historical authenticated sessions and adds `/api/auth/guest`.
3. Verify owner-session resolution, guest creation, CSRF, two-guest isolation, quotas, and MongoDB failure behavior.
4. Deploy the frontend only after the backend endpoint is healthy.
5. Roll back the frontend first if necessary. The backend remains compatible with the authenticated frontend.
6. Roll back the backend only after the authenticated frontend is restored. Retain guest records; do not reassign them to `default` or an owner workspace.

No automatic production migration, guest cleanup, credential change, or provider configuration change is part of this implementation.
