#!/usr/bin/env node
import { runPreflight } from "./release-tooling.mjs";
const result = runPreflight();
console.log(`Release preflight: ${result.ok ? "PASS" : "FAIL"}`);
console.log(`Branch: ${result.branch || "unknown"}`);
console.log(`Commit: ${result.head || "unknown"}`);
for (const note of result.notes) console.log(`PASS ${note}`);
for (const failure of result.failures) console.error(`FAIL ${failure}`);
process.exitCode = result.ok ? 0 : 1;
