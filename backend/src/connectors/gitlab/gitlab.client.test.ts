import { afterEach, describe, expect, it, vi } from "vitest";
import { GitLabClient } from "./gitlab.client.js";

const url = "https://gitlab.test/api/v4/";
function client(response: Response | (() => Promise<Response>)): GitLabClient {
  const fetchImpl = vi.fn(typeof response === "function" ? response : async () => response) as typeof fetch;
  return new GitLabClient({ baseUrl: url, timeoutMs: 50, fetchImpl });
}

afterEach(() => vi.restoreAllMocks());

describe("GitLabClient", () => {
  it.each([
    [429, "rate_limited", true],
    [500, "provider", true],
    [503, "provider", true],
    [401, "authentication", false],
    [403, "authorization", false]
  ])("classifies HTTP %i before parsing its response body", async (status, code, retryable) => {
    const operation = client(new Response("not-json", { status })).get("/projects");
    await expect(operation).rejects.toMatchObject({ code, retryable, statusCode: status });
  });

  it("recognizes a rate-limited 403", async () => {
    const operation = client(new Response("", { status: 403, headers: { "ratelimit-remaining": "0" } })).get("/projects");
    await expect(operation).rejects.toMatchObject({ code: "rate_limited", retryable: true });
  });

  it("parses Retry-After integer seconds", async () => {
    const operation = client(new Response("", { status: 429, headers: { "retry-after": "12" } })).get("/projects");
    await expect(operation).rejects.toMatchObject({ retryAfterSeconds: 12 });
  });

  it("parses Retry-After HTTP dates", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-01-01T00:00:00Z"));
    const operation = client(new Response("", { status: 429, headers: { "retry-after": "Thu, 01 Jan 2026 00:00:09 GMT" } })).get("/projects");
    await expect(operation).rejects.toMatchObject({ retryAfterSeconds: 9 });
  });

  it("classifies invalid JSON on a successful response as malformed", async () => {
    const operation = client(new Response("{", { status: 200, headers: { "content-type": "application/json" } })).get("/projects");
    await expect(operation).rejects.toMatchObject({ code: "malformed_response", retryable: false, statusCode: 200 });
  });

  it.each([null, "text/html"])("rejects a successful response with content type %s", async (contentType) => {
    const headers = contentType === null ? undefined : { "content-type": contentType };
    const operation = client(new Response("[]", { status: 200, headers })).get("/projects");
    await expect(operation).rejects.toMatchObject({ code: "malformed_response", retryable: false });
  });

  it("classifies request timeouts separately", async () => {
    const operation = client(async () => { throw new DOMException("timed out", "TimeoutError"); }).get("/projects");
    await expect(operation).rejects.toMatchObject({ code: "timeout", retryable: true });
  });

  it("classifies network failures separately", async () => {
    const operation = client(async () => { throw new TypeError("socket failed"); }).get("/projects");
    await expect(operation).rejects.toMatchObject({ code: "network", retryable: true });
  });

  it("uses a validated same-endpoint Link next relation when X-Next-Page is absent", async () => {
    const response = new Response("[]", { status: 200, headers: { "content-type": "application/json", link: '<https://gitlab.test/api/v4/projects?search=x&page=2>; rel="next"' } });
    await expect(client(response).get("/projects?search=x&page=1")).resolves.toMatchObject({ nextPage: 2 });
  });

  it("prefers a valid X-Next-Page over Link", async () => {
    const response = new Response("[]", { status: 200, headers: { "content-type": "application/json", "x-next-page": "3", link: '<https://evil.test/projects?page=9>; rel="next"' } });
    await expect(client(response).get("/projects?page=2")).resolves.toMatchObject({ nextPage: 3 });
  });

  it.each([
    { "x-next-page": "next" },
    { link: '<https://evil.test/api/v4/projects?page=2>; rel="next"' },
    { link: '<https://gitlab.test/api/v4/groups?page=2>; rel="next"' },
    { link: '<https://gitlab.test/api/v4/projects?page=zero>; rel="next"' }
  ])("rejects unsafe or malformed pagination metadata", async (paginationHeaders) => {
    const response = new Response("[]", { status: 200, headers: { "content-type": "application/json", ...paginationHeaders } });
    await expect(client(response).get("/projects?page=1")).rejects.toMatchObject({ code: "malformed_response", retryable: false });
  });
});
