#!/usr/bin/env node
import mongoose from "mongoose";
import { safeIndexError } from "./release-tooling.mjs";

const EXPECTED = {
  users: [["emailNormalized", 1]], workspace_memberships: [["workspaceKey", 1], ["userId", 1]], auth_sessions: [["sessionTokenHash", 1], ["expiresAt", 1]],
  search_jobs: [["workspaceKey", 1]], repository_results: [["workspaceKey", 1]], search_cache: [["workspaceKey", 1], ["expiresAt", 1]],
  saved_repositories: [["workspaceKey", 1]], collections: [["workspaceKey", 1]], collection_memberships: [["workspaceKey", 1]],
  watchlists: [["workspaceKey", 1]], change_events: [["workspaceKey", 1]], ai_research_sessions: [["workspaceKey", 1]], ai_research_messages: [["workspaceKey", 1]]
};
const envName = process.argv[process.argv.indexOf("--uri-env") + 1];
if (!process.argv.includes("--acknowledge-read-only") || !envName || !process.env[envName]) {
  console.error("Usage: node scripts/verify-indexes.mjs --uri-env <ENV_NAME> --acknowledge-read-only"); process.exit(1);
}
try {
  await mongoose.connect(process.env[envName], { serverSelectionTimeoutMS: 10_000, autoIndex: false });
  let failed = false;
  for (const [collectionName, fields] of Object.entries(EXPECTED)) {
    const collection = mongoose.connection.db.collection(collectionName);
    const indexes = await collection.indexes();
    const names = fields.map(([field]) => field);
    const missing = names.filter(field => !indexes.some(index => Object.hasOwn(index.key, field)));
    const ttlExpected = collectionName === "auth_sessions" || collectionName === "search_cache";
    const ttlFound = indexes.some(index => typeof index.expireAfterSeconds === "number");
    const ok = missing.length === 0 && (!ttlExpected || ttlFound);
    console.log(`${ok ? "PASS" : "FAIL"} ${collectionName}: ${indexes.length} indexes${missing.length ? `; missing fields ${missing.join(",")}` : ""}${ttlExpected && !ttlFound ? "; TTL missing" : ""}`);
    failed ||= !ok;
  }
  process.exitCode = failed ? 1 : 0;
} catch (error) { const safe = safeIndexError(error); console.error(`${safe.code}: ${safe.message}`); process.exitCode = 1; }
finally { await mongoose.disconnect().catch(() => undefined); }
