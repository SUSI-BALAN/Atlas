import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { AuthSessionModel, GuestWorkspaceModel, UserModel, WorkspaceMembershipModel, WorkspaceModel } from "../../models/auth.model.js";
import { env } from "../../config/env.js";
import { verifyPassword } from "./password.js";

export const tokenHash = (value: string): string => createHash("sha256").update(value).digest("hex");
export const csrfForToken = (token: string): string => createHmac("sha256", token).update("atlas-csrf-v1").digest("base64url");
const fakeHash = "scrypt-v1:" + "00".repeat(32) + ":" + "00".repeat(64);
export interface AuthIdentity { kind: "authenticated" | "guest"; userId: string | null; email: string | null; workspaceKey: string; workspaceName: string; role: "owner" | "member" | "guest"; expiresAt: string; sessionId: string; csrfTokenHash: string; }

export class AuthService {
  async login(email: string, password: string): Promise<{ token: string; csrfToken: string; identity: AuthIdentity } | null> {
    const normalized = email.trim().toLowerCase();
    const user = await UserModel.findOne({ emailNormalized: normalized }).select("+passwordHash").lean();
    const valid = await verifyPassword(password, user?.passwordHash ?? fakeHash);
    if (!user || !valid || user.status !== "active") return null;
    const membership = await WorkspaceMembershipModel.findOne({ userId: user._id }).sort({ createdAt: 1 }).lean();
    if (!membership) return null;
    const workspace = await WorkspaceModel.findOne({ key: membership.workspaceKey }).lean();
    if (!workspace) return null;
    const token = randomBytes(32).toString("base64url");
    const csrfToken = csrfForToken(token);
    const expiresAt = new Date(Date.now() + env.AUTH_SESSION_TTL_SECONDS * 1000);
    const session = await AuthSessionModel.create({ userId: user._id, workspaceKey: workspace.key, sessionTokenHash: tokenHash(token), csrfTokenHash: tokenHash(csrfToken), expiresAt, lastSeenAt: new Date() });
    await UserModel.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
    return { token, csrfToken, identity: { kind: "authenticated", userId: String(user._id), email: user.emailDisplay, workspaceKey: workspace.key, workspaceName: workspace.name, role: membership.role as "owner" | "member", expiresAt: expiresAt.toISOString(), sessionId: String(session._id), csrfTokenHash: tokenHash(csrfToken) } };
  }

  async createGuest(): Promise<{ token: string; identity: AuthIdentity }> {
    const token = randomBytes(32).toString("base64url");
    const csrfToken = csrfForToken(token);
    const workspaceKey = `guest_${randomBytes(24).toString("hex")}`;
    const expiresAt = new Date(Date.now() + env.GUEST_SESSION_TTL_SECONDS * 1000);
    const cleanupEligibleAt = new Date(expiresAt.getTime() + env.GUEST_DATA_RETENTION_DAYS * 86400_000);
    const lease = await GuestWorkspaceModel.create({ workspaceKey, sessionExpiresAt: expiresAt, cleanupEligibleAt, cleanupStatus: "retained" });
    try {
      const session = await AuthSessionModel.create({ kind: "guest", userId: null, workspaceKey, sessionTokenHash: tokenHash(token), csrfTokenHash: tokenHash(csrfToken), expiresAt, lastSeenAt: new Date() });
      return { token, identity: { kind: "guest", userId: null, email: null, workspaceKey, workspaceName: "Private guest workspace", role: "guest", expiresAt: expiresAt.toISOString(), sessionId: String(session._id), csrfTokenHash: tokenHash(csrfToken) } };
    } catch (error) {
      await GuestWorkspaceModel.deleteOne({ _id: lease._id, cleanupStatus: "retained" }).catch(() => undefined);
      throw error;
    }
  }

  async resolve(token: string): Promise<AuthIdentity | null> {
    if (!/^[A-Za-z\d_-]{43}$/.test(token)) return null;
    const session = await AuthSessionModel.findOne({ sessionTokenHash: tokenHash(token), revokedAt: null, expiresAt: { $gt: new Date() } }).select("+sessionTokenHash +csrfTokenHash").lean();
    if (!session || !timingSafeEqual(Buffer.from(session.sessionTokenHash, "hex"), Buffer.from(tokenHash(token), "hex"))) return null;
    if ((session.kind ?? "authenticated") === "guest") {
      return { kind: "guest", userId: null, email: null, workspaceKey: session.workspaceKey, workspaceName: "Private guest workspace", role: "guest", expiresAt: session.expiresAt.toISOString(), sessionId: String(session._id), csrfTokenHash: session.csrfTokenHash };
    }
    const [user, membership, workspace] = await Promise.all([
      UserModel.findById(session.userId).lean(),
      WorkspaceMembershipModel.findOne({ userId: session.userId, workspaceKey: session.workspaceKey }).lean(),
      WorkspaceModel.findOne({ key: session.workspaceKey }).lean()
    ]);
    if (!user || user.status !== "active" || !membership || !workspace) return null;
    return { kind: "authenticated", userId: String(user._id), email: user.emailDisplay, workspaceKey: workspace.key, workspaceName: workspace.name, role: membership.role as "owner" | "member", expiresAt: session.expiresAt.toISOString(), sessionId: String(session._id), csrfTokenHash: session.csrfTokenHash };
  }

  async revoke(token: string): Promise<void> { if (/^[A-Za-z\d_-]{43}$/.test(token)) await AuthSessionModel.updateOne({ sessionTokenHash: tokenHash(token) }, { $set: { revokedAt: new Date() } }); }
  verifyCsrf(identity: AuthIdentity, token: string): boolean {
    if (!/^[A-Za-z\d_-]{43}$/.test(token)) return false;
    return timingSafeEqual(Buffer.from(identity.csrfTokenHash, "hex"), Buffer.from(tokenHash(token), "hex"));
  }
}

export const authService = new AuthService();
