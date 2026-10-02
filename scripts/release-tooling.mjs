import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

export const REQUIRED_RELEASE_DOCS = ["docs/stage-7-release-readiness.md", "docs/release-checklist.md", "docs/backup-recovery.md", "docs/production-release-runbook.md", "docs/production-verification.md", "docs/security.md"];
export const ALLOWED_TSB_BUILD_INFO = ["frontend/tsconfig.app.tsbuildinfo", "frontend/tsconfig.node.tsbuildinfo"];

export function normalizeBaseUrl(value) {
  if (!value) throw new Error("--base-url is required");
  let url;
  try { url = new URL(value); } catch { throw new Error("Invalid base URL"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error("Invalid base URL");
  if (url.pathname !== "/" && url.pathname !== "") throw new Error("Base URL must be an origin without a path");
  return url.origin;
}

export function parseSetCookie(header) {
  if (!header) return null;
  const parts = header.split(";").map(part => part.trim());
  const name = parts.shift()?.split("=", 1)[0] ?? "cookie";
  const attributes = new Map(parts.map(part => { const [key, ...rest] = part.split("="); return [key.toLowerCase(), rest.join("=") || true]; }));
  return { name, redacted: `${name}=[REDACTED]`, httpOnly: attributes.has("httponly"), secure: attributes.has("secure"), sameSite: attributes.get("samesite") ?? null, path: attributes.get("path") ?? null, hasDomain: attributes.has("domain") };
}

export function validateSecurityHeaders(headers, { requireHsts = false } = {}) {
  const failures = [];
  const csp = headers.get("content-security-policy") ?? "";
  if (!csp) failures.push("Content-Security-Policy missing");
  if (!/(^|;)\s*frame-ancestors\s+[^;]+/i.test(csp)) failures.push("CSP frame-ancestors missing");
  if ((headers.get("x-content-type-options") ?? "").toLowerCase() !== "nosniff") failures.push("X-Content-Type-Options must be nosniff");
  if (!headers.get("referrer-policy")) failures.push("Referrer-Policy missing");
  if (requireHsts && !headers.get("strict-transport-security")) failures.push("Strict-Transport-Security missing for HTTPS production verification");
  return failures;
}

export async function boundedFetch(url, options = {}, runtime = {}) {
  const fetchImpl = runtime.fetchImpl ?? fetch;
  const timeoutMs = runtime.timeoutMs ?? 10_000;
  const maxRedirects = runtime.maxRedirects ?? 3;
  let current = url;
  const originalOrigin = new URL(url).origin;
  for (let redirects = 0; redirects <= maxRedirects; redirects++) {
    const response = await fetchImpl(current, { ...options, redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    if (redirects === maxRedirects) throw new Error(`Redirect limit exceeded (${maxRedirects})`);
    const location = response.headers.get("location");
    if (!location) throw new Error("Redirect response omitted Location");
    const redirectUrl = new URL(location, current);
    if (redirectUrl.origin !== originalOrigin) throw new Error("CROSS_ORIGIN_REDIRECT: redirect target must remain on the configured origin");
    current = redirectUrl.toString();
  }
  throw new Error("Redirect limit exceeded");
}

export function safeIndexError(error) {
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
  const name = error instanceof Error ? error.name.toLowerCase() : "";
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (code === 18 || name.includes("auth") || message.includes("authentication") || message.includes("not authorized")) {
    return { code: "INDEX_AUTH_FAILED", message: "MongoDB rejected the index-verification credential" };
  }
  if (name.includes("timeout") || message.includes("timed out") || message.includes("timeout") || message.includes("server selection")) {
    return { code: "INDEX_TIMEOUT", message: "MongoDB index verification timed out" };
  }
  if (name.includes("mongo") || message.includes("connect") || message.includes("dns") || message.includes("enotfound")) {
    return { code: "INDEX_CONNECTION_FAILED", message: "MongoDB index verification could not connect" };
  }
  return { code: "INDEX_VERIFICATION_FAILED", message: "MongoDB index verification failed" };
}

export async function verifyHosted(options, runtime = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  if (options.checkMutations && !options.allowMutations) throw new Error("--allow-mutations is required for write checks");
  const results = [];
  const request = async (path, init = {}) => {
    let response;
    try { response = await boundedFetch(`${baseUrl}${path}`, init, runtime); }
    catch (error) { throw new Error(`${path}: ${error instanceof Error ? error.message : "request failed"}`); }
    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("json") ? await response.json() : await response.text();
    return { response, body, contentType };
  };
  const health = await request("/api/health");
  results.push(check(health.response.ok && health.body?.success === true, "health", `HTTP ${health.response.status}`));
  const ready = await request("/api/health/ready");
  results.push(check(ready.response.ok && ready.body?.data?.status === "ready", "readiness", `HTTP ${ready.response.status}`));
  const version = await request("/api/version");
  const commit = version.body?.data?.commit;
  results.push(check(version.response.ok && version.body?.success === true, "version", `HTTP ${version.response.status}`));
  if (options.expectedCommit) results.push(check(typeof commit === "string" && commit.toLowerCase().startsWith(options.expectedCommit.toLowerCase()), "expected commit", `reported ${commit ?? "none"}`));
  for (const failure of validateSecurityHeaders(version.response.headers, { requireHsts: options.production === true && baseUrl.startsWith("https://") })) results.push(check(false, "security headers", failure));
  results.push(check(version.contentType.includes("json") && typeof version.body === "object", "proxy path", "API path returned non-JSON content (possible SPA fallback)"));
  const protectedRoute = await request("/api/saved");
  results.push(check(protectedRoute.response.status === 401 && protectedRoute.body?.error?.code === "UNAUTHENTICATED", "unauthenticated protected route", `HTTP ${protectedRoute.response.status}`));
  if (options.email || options.password) {
    if (!options.email || !options.password) throw new Error("Both ATLAS_SMOKE_EMAIL and ATLAS_SMOKE_PASSWORD are required");
    const login = await request("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: options.email, password: options.password }) });
    const rawCookie = login.response.headers.get("set-cookie");
    const cookie = parseSetCookie(rawCookie);
    results.push(check(login.response.ok && cookie, "login", `HTTP ${login.response.status}`));
    if (cookie) {
      results.push(check(cookie.httpOnly && cookie.secure && cookie.sameSite === "Strict" && cookie.path === "/" && !cookie.hasDomain, "cookie attributes", JSON.stringify(cookie)));
      const cookieHeader = rawCookie.split(";", 1)[0];
      const me = await request("/api/auth/me", { headers: { cookie: cookieHeader } });
      results.push(check(me.response.ok, "authenticated identity", `HTTP ${me.response.status}`));
      const csrf = await request("/api/auth/csrf", { headers: { cookie: cookieHeader } });
      const csrfToken = csrf.body?.data?.token;
      results.push(check(csrf.response.ok && typeof csrfToken === "string", "CSRF retrieval", `HTTP ${csrf.response.status}`));
      const ai = await request("/api/ai/status", { headers: { cookie: cookieHeader } });
      results.push(check(ai.response.ok && (!options.expectAiDisabled || ai.body?.data?.provider === "none"), "AI mode", `HTTP ${ai.response.status}`));
      const logout = await request("/api/auth/logout", { method: "POST", headers: { cookie: cookieHeader, "x-csrf-token": csrfToken } });
      results.push(check(logout.response.ok, "logout", `HTTP ${logout.response.status}`));
      const after = await request("/api/auth/me", { headers: { cookie: cookieHeader } });
      results.push(check(after.response.status === 401, "post-logout rejection", `HTTP ${after.response.status}`));
    }
  }
  if (options.checkMutations) results.push(check(true, "mutation safety gate", "enabled; no general mutation suite is configured"));
  return results;
}
function check(ok, name, detail) { return { ok: Boolean(ok), name, detail }; }

export function runPreflight({ cwd = process.cwd(), run = defaultRun, exists = path => existsSync(path), requiredDocs = REQUIRED_RELEASE_DOCS } = {}) {
  const failures = [], notes = [];
  const command = (label, executable, args, inspect = () => true, acceptedStatuses = [0]) => {
    const result = run(executable, args, cwd);
    if (!acceptedStatuses.includes(result.status) || !inspect(result.stdout ?? "")) failures.push(`${label} failed${result.stderr ? `: ${result.stderr.trim()}` : ""}`); else notes.push(`${label}: ok`);
    return result.stdout ?? "";
  };
  const status = command("clean working tree", "git", ["status", "--porcelain"], output => output.trim() === "");
  const branch = command("release branch", "git", ["branch", "--show-current"], output => output.trim() === "stage7-release-readiness").trim();
  const head = command("HEAD identity", "git", ["rev-parse", "HEAD"]).trim();
  command("base commit ancestry", "git", ["merge-base", "--is-ancestor", "226b2fa", "HEAD"]);
  command("unstaged diff check", "git", ["diff", "--check"]);
  command("staged diff check", "git", ["diff", "--cached", "--check"]);
  const tracked = command("tracked artifact inventory", "git", ["ls-files"]).split(/\r?\n/).filter(Boolean);
  const badEnv = tracked.filter(path => /(^|\/)\.env(?:\.|$)/.test(path) && !path.endsWith(".env.example"));
  const dist = tracked.filter(path => /(^|\/)dist\//.test(path));
  const unexpectedBuildInfo = tracked.filter(path => path.endsWith(".tsbuildinfo") && !ALLOWED_TSB_BUILD_INFO.includes(path));
  if (badEnv.length) failures.push(`tracked private env files: ${badEnv.join(", ")}`);
  if (dist.length) failures.push(`tracked dist files: ${dist.join(", ")}`);
  if (unexpectedBuildInfo.length) failures.push(`unexpected tracked tsbuildinfo: ${unexpectedBuildInfo.join(", ")}`);
  const missing = requiredDocs.filter(path => !exists(path));
  if (missing.length) failures.push(`missing release documents: ${missing.join(", ")}`);
  command("secret-pattern scan", "git", ["grep", "-I", "-n", "-E", "(mongodb(\\+srv)?://[^[:space:]]+:[^@[:space:]]+@|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|AKIA[0-9A-Z]{16})"], output => output.split(/\r?\n/).filter(line => line && !line.startsWith("scripts/release-tooling.mjs:")).length === 0, [0, 1]);
  command("typecheck", "npm.cmd", ["run", "typecheck"]);
  command("tests", "npm.cmd", ["test"]);
  command("production build", "npm.cmd", ["run", "build"]);
  command("production dependency audit", "npm.cmd", ["audit", "--omit=dev", "--audit-level=high"]);
  return { ok: failures.length === 0, failures, notes, branch, head, dirty: Boolean(status.trim()) };
}
function defaultRun(executable, args, cwd) { return spawnSync(executable, args, { cwd, encoding: "utf8", shell: process.platform === "win32" }); }
