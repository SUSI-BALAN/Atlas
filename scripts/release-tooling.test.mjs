import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { boundedFetch, normalizeBaseUrl, parseSetCookie, runPreflight, safeIndexError, validateSecurityHeaders, verifyHosted } from "./release-tooling.mjs";

const secureHeaders = { "content-type": "application/json", "content-security-policy": "default-src 'self'; frame-ancestors 'none'", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" };
function json(status, body, headers = {}) { return new Response(JSON.stringify(body), { status, headers: { ...secureHeaders, ...headers } }); }
function mockHosted({ commit = "226b2fa123", ready = true, spa = false } = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const path = new URL(url).pathname; calls.push({ path, method: init.method ?? "GET", body: init.body });
    if (path === "/api/health") return json(200, { success: true, data: { status: "healthy" } });
    if (path === "/api/health/ready") return json(ready ? 200 : 503, { success: ready, data: { status: ready ? "ready" : "not_ready" } });
    if (path === "/api/version") return spa ? new Response("<html>SPA</html>", { status: 200, headers: { ...secureHeaders, "content-type": "text/html" } }) : json(200, { success: true, data: { commit } });
    if (path === "/api/saved") return json(401, { success: false, error: { code: "UNAUTHENTICATED" } });
    throw new Error(`unexpected ${path}`);
  };
  return { fetchImpl, calls };
}
function preflightRuntime({ dirty = false, missing = false } = {}) {
  const run = (_exe, args) => {
    const key = args.join(" ");
    if (key === "status --porcelain") return { status: 0, stdout: dirty ? " M README.md\n" : "", stderr: "" };
    if (key === "branch --show-current") return { status: 0, stdout: "stage7-release-readiness\n", stderr: "" };
    if (key === "rev-parse HEAD") return { status: 0, stdout: "226b2fa000\n", stderr: "" };
    if (key === "ls-files") return { status: 0, stdout: "README.md\nfrontend/tsconfig.app.tsbuildinfo\nfrontend/tsconfig.node.tsbuildinfo\n", stderr: "" };
    if (args[0] === "grep") return { status: 1, stdout: "", stderr: "" };
    return { status: 0, stdout: "", stderr: "" };
  };
  return { run, exists: path => !(missing && path.includes("release-checklist")) };
}

test("preflight success", () => assert.equal(runPreflight(preflightRuntime()).ok, true));
test("preflight rejects a dirty tree", () => assert.match(runPreflight(preflightRuntime({ dirty: true })).failures.join(" "), /clean working tree/));
test("preflight rejects a missing release document", () => assert.match(runPreflight(preflightRuntime({ missing: true })).failures.join(" "), /release-checklist/));
test("version match succeeds", async () => assert.equal((await verifyHosted({ baseUrl: "https://example.test", expectedCommit: "226b2fa" }, mockHosted())).find(x => x.name === "expected commit").ok, true));
test("version mismatch fails", async () => assert.equal((await verifyHosted({ baseUrl: "https://example.test", expectedCommit: "badcafe" }, mockHosted())).find(x => x.name === "expected commit").ok, false));
test("health succeeds", async () => assert.equal((await verifyHosted({ baseUrl: "https://example.test" }, mockHosted())).find(x => x.name === "health").ok, true));
test("readiness failure is reported", async () => assert.equal((await verifyHosted({ baseUrl: "https://example.test" }, mockHosted({ ready: false }))).find(x => x.name === "readiness").ok, false));
test("unauthenticated protected route is required", async () => assert.equal((await verifyHosted({ baseUrl: "https://example.test" }, mockHosted())).find(x => x.name === "unauthenticated protected route").ok, true));
test("CSP validation requires frame-ancestors", () => assert.match(validateSecurityHeaders(new Headers({ ...secureHeaders, "content-security-policy": "default-src 'self'" })).join(" "), /frame-ancestors/));
test("security header validation detects missing protections", () => assert.equal(validateSecurityHeaders(new Headers()).length, 4));
test("cookie parser redacts the value and checks attributes", () => { const result = parseSetCookie("atlas_session=top-secret; HttpOnly; Secure; SameSite=Strict; Path=/"); assert.equal(result.redacted, "atlas_session=[REDACTED]"); assert.doesNotMatch(JSON.stringify(result), /top-secret/); assert.equal(result.hasDomain, false); });
test("verification output never includes supplied credentials", async () => { const runtime = mockHosted(); runtime.fetchImpl = async (url, init = {}) => { const path = new URL(url).pathname; if (path === "/api/auth/login") return json(200, { success: true }, { "set-cookie": "atlas_session=opaque; HttpOnly; Secure; SameSite=Strict; Path=/" }); if (path === "/api/auth/me" && init.method === "POST") return json(404, {}); if (path === "/api/auth/me" && init.headers?.cookie) return json(401, { error: { code: "UNAUTHENTICATED" } }); if (path === "/api/auth/csrf") return json(200, { data: { token: "csrf-secret" } }); if (path === "/api/ai/status") return json(200, { data: { provider: "none" } }); if (path === "/api/auth/logout") return json(200, { success: true }); return mockHosted().fetchImpl(url, init); }; const result = await verifyHosted({ baseUrl: "https://example.test", email: "owner@example.test", password: "password-secret" }, runtime); assert.doesNotMatch(JSON.stringify(result), /password-secret|csrf-secret|opaque/); });
test("default smoke mode makes GET requests only", async () => { const runtime = mockHosted(); await verifyHosted({ baseUrl: "https://example.test" }, runtime); assert.deepEqual(new Set(runtime.calls.map(call => call.method)), new Set(["GET"])); });
test("write checks require allow-mutations", async () => await assert.rejects(verifyHosted({ baseUrl: "https://example.test", checkMutations: true }, mockHosted()), /allow-mutations/));
test("invalid base URLs are rejected", () => assert.throws(() => normalizeBaseUrl("file:///tmp/x"), /Invalid/));
test("HTTP timeout is handled", async () => await assert.rejects(boundedFetch("https://example.test", {}, { timeoutMs: 1, fetchImpl: (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason))) }), /timeout|aborted/i));
test("redirect handling is bounded", async () => await assert.rejects(boundedFetch("https://example.test", {}, { maxRedirects: 1, fetchImpl: async () => new Response(null, { status: 302, headers: { location: "/again" } }) }), /Redirect limit/));
test("same-origin redirect succeeds", async () => {
  const contacted = [];
  const response = await boundedFetch("https://example.test/start", {}, { fetchImpl: async url => { contacted.push(url); return contacted.length === 1 ? new Response(null, { status: 302, headers: { location: "/finish" } }) : new Response("ok"); } });
  assert.equal(await response.text(), "ok");
  assert.deepEqual(contacted, ["https://example.test/start", "https://example.test/finish"]);
});
test("same-origin redirect chain stays within the limit", async () => {
  let count = 0;
  const response = await boundedFetch("https://example.test/0", {}, { maxRedirects: 3, fetchImpl: async () => ++count <= 3 ? new Response(null, { status: 307, headers: { location: `/${count}` } }) : new Response("done") });
  assert.equal(await response.text(), "done");
  assert.equal(count, 4);
});
test("cross-origin unauthenticated redirect is rejected before contact", async () => {
  const contacted = [];
  await assert.rejects(boundedFetch("https://example.test/start", {}, { fetchImpl: async url => { contacted.push(url); return new Response(null, { status: 302, headers: { location: "https://other.test/collect" } }); } }), /CROSS_ORIGIN_REDIRECT/);
  assert.deepEqual(contacted, ["https://example.test/start"]);
});
test("cross-origin authenticated redirect never replays sensitive state", async () => {
  const sensitive = "password-marker cookie-marker csrf-marker";
  const contacted = [];
  let output = "";
  try {
    await boundedFetch("https://example.test/login", { method: "POST", headers: { cookie: "cookie-marker", "x-csrf-token": "csrf-marker" }, body: "password-marker" }, { fetchImpl: async (url, init) => { contacted.push({ url, init }); return new Response(null, { status: 307, headers: { location: "https://other.test/collect" } }); } });
  } catch (error) { output = error instanceof Error ? error.message : String(error); }
  assert.equal(contacted.length, 1);
  assert.equal(contacted[0].url, "https://example.test/login");
  assert.match(output, /CROSS_ORIGIN_REDIRECT/);
  for (const marker of sensitive.split(" ")) assert.doesNotMatch(output, new RegExp(marker));
});
test("index errors are classified without connection-string fragments", () => {
  const markers = ["synthetic-user", "synthetic-password", "host-marker", "query-secret"];
  const error = new Error(`MongoServerSelectionError mongodb://synthetic-user:synthetic-password@host-marker/db?token=query-secret server selection timed out`);
  error.name = "MongoServerSelectionError";
  const safe = safeIndexError(error);
  assert.equal(safe.code, "INDEX_TIMEOUT");
  for (const marker of markers) assert.doesNotMatch(JSON.stringify(safe), new RegExp(marker));
});
test("index authentication errors expose only a safe classification", () => {
  const error = Object.assign(new Error("Authentication failed for mongodb://user-marker:password-marker@host-marker/db?key=query-marker"), { code: 18 });
  const safe = safeIndexError(error);
  assert.deepEqual(safe, { code: "INDEX_AUTH_FAILED", message: "MongoDB rejected the index-verification credential" });
  assert.doesNotMatch(JSON.stringify(safe), /user-marker|password-marker|host-marker|query-marker/);
});
test("index verifier process redacts synthetic URI markers from output", () => {
  const uri = "mongodb://cli-user-marker:cli-password-marker@[invalid/db?authSource=cli-query-marker";
  const result = spawnSync(process.execPath, [new URL("./verify-indexes.mjs", import.meta.url).pathname.slice(1), "--uri-env", "ATLAS_INDEX_TEST_URI", "--acknowledge-read-only"], {
    cwd: new URL("..", import.meta.url).pathname.slice(1), encoding: "utf8", env: { ...process.env, ATLAS_INDEX_TEST_URI: uri }
  });
  const output = `${result.stdout}${result.stderr}`;
  assert.notEqual(result.status, 0);
  assert.match(output, /INDEX_(CONNECTION_FAILED|AUTH_FAILED|TIMEOUT|VERIFICATION_FAILED)/);
  assert.doesNotMatch(output, /cli-user-marker|cli-password-marker|invalid|cli-query-marker|mongodb:\/\//i);
});
test("proxy path rejects SPA content", async () => assert.equal((await verifyHosted({ baseUrl: "https://example.test" }, mockHosted({ spa: true }))).find(x => x.name === "proxy path").ok, false));
test("AI-disabled release check accepts provider none", async () => {
  let meCalls = 0;
  const base = mockHosted();
  base.fetchImpl = async (url, init = {}) => {
    const path = new URL(url).pathname;
    if (path === "/api/auth/login") return json(200, { success: true }, { "set-cookie": "atlas_session=opaque; HttpOnly; Secure; SameSite=Strict; Path=/" });
    if (path === "/api/auth/me") return ++meCalls === 1 ? json(200, { success: true }) : json(401, { error: { code: "UNAUTHENTICATED" } });
    if (path === "/api/auth/csrf") return json(200, { data: { token: "redacted-by-design" } });
    if (path === "/api/ai/status") return json(200, { data: { provider: "none" } });
    if (path === "/api/auth/logout") return json(200, { success: true });
    return mockHosted().fetchImpl(url, init);
  };
  const results = await verifyHosted({ baseUrl: "https://example.test", email: "owner@example.test", password: "runtime-only", expectAiDisabled: true }, base);
  assert.equal(results.find(result => result.name === "AI mode").ok, true);
});
test("rollback documentation contains every required failure class", () => {
  const document = readFileSync(new URL("../docs/release-checklist.md", import.meta.url), "utf8");
  for (const failure of ["Frontend deployment", "Backend deployment", "Authentication", "Proxy/cookie", "Migration", "AI provider", "Database connectivity"]) assert.match(document, new RegExp(failure, "i"));
});
