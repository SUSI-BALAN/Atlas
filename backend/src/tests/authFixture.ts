import { vi } from "vitest";
import { authService, type AuthIdentity } from "../services/auth/auth.service.js";

export const testIdentity: AuthIdentity = {
  userId: "507f191e810c19729de860a1", email: "owner@example.test", workspaceKey: "default",
  workspaceName: "Test workspace", role: "owner", expiresAt: "2030-01-01T00:00:00.000Z",
  sessionId: "507f191e810c19729de860a2", csrfTokenHash: "00".repeat(32)
};
export const testCookie = "atlas_session=" + "A".repeat(43);
export function allowTestAuth() {
  vi.spyOn(authService, "resolve").mockResolvedValue(testIdentity);
  vi.spyOn(authService, "verifyCsrf").mockReturnValue(true);
}
