#!/usr/bin/env node
import { verifyHosted } from "./release-tooling.mjs";
function value(name) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
const options = { baseUrl: value("--base-url"), expectedCommit: value("--expected-commit"), production: process.argv.includes("--production"), allowMutations: process.argv.includes("--allow-mutations"), checkMutations: process.argv.includes("--check-mutations"), expectAiDisabled: process.argv.includes("--expect-ai-disabled"), email: process.env.ATLAS_SMOKE_EMAIL, password: process.env.ATLAS_SMOKE_PASSWORD };
try {
  const results = await verifyHosted(options);
  for (const result of results) console[result.ok ? "log" : "error"](`${result.ok ? "PASS" : "FAIL"} ${result.name}: ${result.detail}`);
  if (results.some(result => !result.ok)) process.exitCode = 1;
} catch (error) { console.error(`Verification failed: ${error instanceof Error ? error.message : "unknown error"}`); process.exitCode = 1; }
