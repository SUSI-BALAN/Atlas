import { describe, expect, it, vi } from "vitest";
// @ts-expect-error The migration is a run-once JavaScript CLI with no TypeScript declarations.
import { migrate, migrationFilter, migrationUpdate } from "../../scripts/migrate-stage6-workspace.mjs";

function database() {
  const rows: Record<string, Array<Record<string, unknown>>> = {
    workspaces: [{ _id: "workspace", key: "default" }],
    workspace_memberships: [{ workspaceKey: "default", role: "owner", userId: "owner" }],
    users: [{ _id: "owner", status: "active" }],
    search_jobs: [{ _id: "job", request: { query: "private research" } }],
    repository_results: [{ _id: "result", jobId: "job", description: "private text" }],
    search_cache: [{ _id: "cache", cacheKey: "hash", jobId: "job" }],
    saved_repositories: [{ _id: "saved", workspaceKey: "default", note: "private note" }]
  };
  const indexes = new Map<string, Array<{ name: string }>>();
  indexes.set("search_cache", [{ name: "cacheKey_1" }]);
  const collection = (name: string) => ({
    findOne: async (query: Record<string, unknown>) => rows[name]?.find(row => Object.entries(query).every(([key, value]) => row[key] === value)) ?? null,
    countDocuments: async (filter: Record<string, unknown>) => rows[name]?.filter(row => filter.workspaceKey ? !("workspaceKey" in row) : true).length ?? 0,
    updateMany: vi.fn(async () => { for (const row of rows[name] ?? []) if (!("workspaceKey" in row)) row.workspaceKey = "default"; }),
    createIndex: vi.fn(async () => "new-index"),
    indexes: async () => indexes.get(name) ?? [],
    dropIndex: vi.fn(async (index: string) => { indexes.set(name, (indexes.get(name) ?? []).filter(item => item.name !== index)); })
  });
  const models = new Map<string, ReturnType<typeof collection>>();
  const db = { collection: (name: string) => { if (!models.has(name)) models.set(name, collection(name)); return models.get(name)!; }, listCollections: () => ({ toArray: async () => Object.keys(rows).map(name => ({ name })) }) };
  return { db, rows, models };
}

describe("Stage 6 additive workspace migration", () => {
  it("dry-run reports counts only and changes nothing", async () => {
    const { db, rows } = database();
    const before = structuredClone(rows);
    const report = vi.fn();
    const counts = await migrate(db, false, report);
    expect(counts.search_jobs).toBe(1);
    expect(rows).toEqual(before);
    expect(JSON.stringify(report.mock.calls)).not.toContain("private");
  });
  it("applies missing default ownership without changing IDs and is idempotent", async () => {
    const { db, rows } = database();
    const ids = [rows.search_jobs[0]._id, rows.repository_results[0]._id];
    await migrate(db, true);
    expect(rows.search_jobs[0]).toMatchObject({ _id: ids[0], workspaceKey: "default" });
    expect(rows.repository_results[0]).toMatchObject({ _id: ids[1], workspaceKey: "default" });
    expect(rows.search_cache[0].workspaceKey).toBe("default");
    const repeated = await migrate(db, true);
    expect(repeated.search_jobs).toBe(0);
    expect(rows.search_jobs).toHaveLength(1);
  });
  it("uses a missing-field filter and additive update", () => {
    expect(migrationFilter()).toEqual({ workspaceKey: { $exists: false } });
    expect(migrationUpdate()).toEqual({ $set: { workspaceKey: "default" } });
  });
  it("refuses to migrate without an owner", async () => {
    const { db, rows } = database();
    rows.workspace_memberships.length = 0;
    await expect(migrate(db, true)).rejects.toThrow("owner membership");
    expect(rows.search_jobs[0].workspaceKey).toBeUndefined();
  });
});
