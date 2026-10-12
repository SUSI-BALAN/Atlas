import mongoose from "mongoose";
import { pathToFileURL } from "node:url";

export const collections = [
  "search_jobs", "repository_results", "search_cache", "searchhistories", "rawitems", "normalizeditems",
  "saved_repositories", "collections", "collection_memberships", "watchlists", "watchlist_memberships",
  "repository_watch_states", "change_events", "watch_check_runs", "ai_research_sessions", "ai_research_messages"
];

export function migrationFilter() { return { workspaceKey: { $exists: false } }; }
export function migrationUpdate() { return { $set: { workspaceKey: "default" } }; }

export async function migrate(db, apply = false, report = () => {}) {
  const workspace = await db.collection("workspaces").findOne({ key: "default" }, { projection: { _id: 1 } });
  const owner = await db.collection("workspace_memberships").findOne({ workspaceKey: "default", role: "owner" }, { projection: { userId: 1 } });
  if (!workspace || !owner) throw new Error("Default workspace and owner membership must exist before migration");
  const user = await db.collection("users").findOne({ _id: owner.userId, status: "active" }, { projection: { _id: 1 } });
  if (!user) throw new Error("Active owner user is required before migration");
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(row => row.name));
  const counts = {};
  for (const name of collections) {
    if (!existing.has(name)) { counts[name] = 0; report(name, 0); continue; }
    const collection = db.collection(name);
    const count = await collection.countDocuments(migrationFilter());
    counts[name] = count;
    if (apply && count) await collection.updateMany(migrationFilter(), migrationUpdate());
    report(name, count);
  }
  if (apply) {
    for (const [name, fields, oldIndex] of [
      ["search_cache", { workspaceKey: 1, cacheKey: 1 }, "cacheKey_1"],
      ["normalizeditems", { workspaceKey: 1, source: 1, sourceId: 1 }, "source_1_sourceId_1"]
    ]) {
      if (!existing.has(name)) continue;
      const collection = db.collection(name);
      await collection.createIndex(fields, { unique: true });
      const indexes = await collection.indexes();
      if (indexes.some(index => index.name === oldIndex)) await collection.dropIndex(oldIndex);
    }
    for (const name of collections) {
      if (!existing.has(name)) continue;
      const remaining = await db.collection(name).countDocuments(migrationFilter());
      if (remaining) throw new Error(`Migration incomplete for ${name}: ${remaining} records remain`);
    }
  }
  return counts;
}

async function main() {
  const mode = process.argv.slice(2);
  if (mode.length !== 1 || !["--dry-run", "--apply"].includes(mode[0])) throw new Error("Specify exactly --dry-run or --apply");
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI must be supplied in the process environment");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection unavailable");
    const ping = await db.admin().ping();
    if (ping.ok !== 1) throw new Error("Database ping failed");
    process.stdout.write(`${mode[0] === "--apply" ? "Apply" : "Dry run"} counts by collection:\n`);
    await migrate(db, mode[0] === "--apply", (name, count) => process.stdout.write(`${name}: ${count}\n`));
  } finally { await mongoose.disconnect(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { process.stderr.write("Workspace migration failed; no connection or document data was printed.\n"); process.exitCode = 1; });
}
