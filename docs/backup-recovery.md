# Backup and recovery plan

This plan defines release gates; it does not claim a backup exists. The owner must verify the actual MongoDB Atlas tier, project permissions, retention, snapshot/PITR availability, and restore procedure before release.

## Protection scope

Protect users, memberships, password hashes, sessions, workspace-owned search jobs/results/cache/history, saved repositories, collections/memberships, watchlists/state/check runs/changes, AI sessions/messages, and index definitions. Keep database credentials, backup credentials, and deployment credentials separated with least privilege. Backups and evidence must not expose URIs, session material, notes, prompts, or provider tokens.

## Checkpoint and logical backup

Prefer an Atlas-managed snapshot or point-in-time checkpoint supported by the active tier. Record project/cluster, UTC time, retention, encryption/access policy, and restore owner without recording credentials. A logical `mongodump` can supplement platform recovery for portable collection-level inspection; use a dedicated approved account, encrypted storage, matching tool versions, and a consistency plan. A logical dump alone does not prove a restorable service.

## Restore verification

Restore into an isolated non-production target. Verify collection counts by safe category, required indexes and TTL indexes, representative ownership references, authentication with disposable credentials, workspace isolation, health/readiness/version, and Stage 0–7 regressions. Document duration and gaps, then destroy the isolated copy through the separately approved data-retention process.

## Failed migration recovery

1. Stop the migration and application writes; retain sanitized logs and category counts.
2. Do not rerun `--apply` until the failure and idempotency impact are reviewed.
3. Choose a reviewed corrective migration or restore the pre-migration checkpoint into a controlled target.
4. Verify indexes, ownership, counts, and isolation before reopening writes.
5. Never recover by restoring the exposed historical credential.

## Bad application deployment recovery

Roll back frontend and/or backend to the last reviewed SHA that is schema-compatible with the current database. Do not reverse a completed data migration by deploying incompatible code. Verify version identity, readiness, proxy/cookies, auth/CSRF, workspace isolation, core research paths, AI-disabled behavior, and clean logs before declaring recovery complete.
