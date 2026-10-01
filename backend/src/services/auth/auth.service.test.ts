import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserModel, WorkspaceModel, WorkspaceMembershipModel, AuthSessionModel } from "../../models/auth.model.js";
import { hashPassword, verifyPassword } from "./password.js";
import { AuthService, csrfForToken, tokenHash } from "./auth.service.js";
import { sessionCookie, readSessionCookie } from "../../middleware/auth.js";

const id = "507f191e810c19729de860a1";
const user = { _id: id, emailDisplay: "Owner@Example.Test", status: "active", passwordHash: "" };
const membership = { workspaceKey: "default", role: "owner" };
const workspace = { key: "default", name: "Atlas workspace" };
const chain = (value: unknown) => ({ select: () => ({ lean: async () => value }), sort: () => ({ lean: async () => value }), lean: async () => value });

describe("authentication core", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("uses a salted versioned password hash and verifies the correct password", async () => {
    const one = await hashPassword("correct horse battery staple");
    const two = await hashPassword("correct horse battery staple");
    expect(one).toMatch(/^scrypt-v1:[a-f\d]{64}:[a-f\d]{128}$/);
    expect(one).not.toBe(two);
    expect(await verifyPassword("correct horse battery staple", one)).toBe(true);
    expect(await verifyPassword("wrong horse battery staple", one)).toBe(false);
  });

  it("rejects unbounded and short passwords", async () => {
    await expect(hashPassword("short")).rejects.toThrow();
    await expect(hashPassword("x".repeat(1025))).rejects.toThrow();
  });

  it("normalizes email, creates a fresh hashed session and never persists raw tokens", async () => {
    const passwordHash = await hashPassword("correct horse battery staple");
    const findUser = vi.spyOn(UserModel, "findOne").mockReturnValue(chain({ ...user, passwordHash }) as never);
    vi.spyOn(WorkspaceMembershipModel, "findOne").mockReturnValue(chain(membership) as never);
    vi.spyOn(WorkspaceModel, "findOne").mockReturnValue({ lean: async () => workspace } as never);
    const create = vi.spyOn(AuthSessionModel, "create").mockResolvedValue({ _id: id } as never);
    vi.spyOn(UserModel, "updateOne").mockResolvedValue({} as never);
    const service = new AuthService();
    const first = await service.login(" OWNER@Example.Test ", "correct horse battery staple");
    const second = await service.login("owner@example.test", "correct horse battery staple");
    expect(findUser).toHaveBeenCalledWith({ emailNormalized: "owner@example.test" });
    expect(first?.token).not.toBe(second?.token);
    expect(first?.identity.workspaceKey).toBe("default");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ sessionTokenHash: tokenHash(first!.token), csrfTokenHash: tokenHash(first!.csrfToken) }));
    expect(JSON.stringify(create.mock.calls)).not.toContain(first!.token);
    expect(JSON.stringify(create.mock.calls)).not.toContain(first!.csrfToken);
  });

  it("uses the same generic rejection for absent user and wrong password", async () => {
    const passwordHash = await hashPassword("correct horse battery staple");
    const findUser = vi.spyOn(UserModel, "findOne");
    findUser.mockReturnValueOnce(chain(null) as never).mockReturnValueOnce(chain({ ...user, passwordHash }) as never);
    const service = new AuthService();
    expect(await service.login("missing@example.test", "wrong password")).toBeNull();
    expect(await service.login("owner@example.test", "wrong password")).toBeNull();
  });

  it("rejects expired, revoked, disabled-user and missing-membership sessions", async () => {
    const token = "A".repeat(43);
    const session = { _id: id, userId: id, sessionTokenHash: tokenHash(token), csrfTokenHash: tokenHash(csrfForToken(token)), workspaceKey: "default", expiresAt: new Date("2030-01-01") };
    const findSession = vi.spyOn(AuthSessionModel, "findOne");
    const findUser = vi.spyOn(UserModel, "findById");
    const findMembership = vi.spyOn(WorkspaceMembershipModel, "findOne");
    vi.spyOn(WorkspaceModel, "findOne").mockReturnValue({ lean: async () => workspace } as never);
    const service = new AuthService();
    findSession.mockReturnValueOnce(chain(null) as never);
    expect(await service.resolve(token)).toBeNull();
    findSession.mockReturnValue(chain(session) as never);
    findUser.mockReturnValueOnce({ lean: async () => ({ ...user, status: "disabled" }) } as never);
    findMembership.mockReturnValue(chain(membership) as never);
    expect(await service.resolve(token)).toBeNull();
    findUser.mockReturnValue({ lean: async () => user } as never);
    findMembership.mockReturnValue(chain(null) as never);
    expect(await service.resolve(token)).toBeNull();
    findMembership.mockReturnValue(chain(membership) as never);
    expect((await service.resolve(token))?.workspaceKey).toBe("default");
    expect(findSession).toHaveBeenCalledWith(expect.objectContaining({ revokedAt: null, expiresAt: { $gt: expect.any(Date) } }));
  });

  it("revokes by hashed token and validates session-bound CSRF", async () => {
    const token = "A".repeat(43);
    const update = vi.spyOn(AuthSessionModel, "updateOne").mockResolvedValue({} as never);
    const service = new AuthService();
    await service.revoke(token);
    expect(update).toHaveBeenCalledWith({ sessionTokenHash: tokenHash(token) }, { $set: { revokedAt: expect.any(Date) } });
    expect(service.verifyCsrf({ csrfTokenHash: tokenHash(csrfForToken(token)) } as never, csrfForToken(token))).toBe(true);
    expect(service.verifyCsrf({ csrfTokenHash: tokenHash(csrfForToken(token)) } as never, "bad")).toBe(false);
  });

  it("sets host-only HttpOnly session cookies and parses only the named cookie", () => {
    expect(sessionCookie("opaque")).toContain("HttpOnly; Path=/; SameSite=Strict");
    expect(sessionCookie("opaque")).not.toContain("Domain=");
    expect(sessionCookie("opaque", true)).toContain("; Secure");
    expect(readSessionCookie("unrelated=x; atlas_session=opaque; other=y")).toBe("opaque");
  });
});
