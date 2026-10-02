import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { authService } from "../services/auth/auth.service.js";
import { clearSessionCookie, currentCsrfToken, readSessionCookie, requireAuth, requireCsrf, sessionCookie } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { env } from "../config/env.js";

const loginSchema = z.strictObject({ email: z.email().max(254), password: z.string().min(1).max(1024) });
export function createAuthRouter() {
const loginLimit = rateLimit({ windowMs: 15 * 60_000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ success: false, error: { code: "LOGIN_RATE_LIMITED", message: "Too many login attempts; try again later" }, meta: { requestId: res.locals.requestId } }) });
const authRouter = Router();
authRouter.post("/login", loginLimit, async (req, res, next) => {
  try {
    const origin = req.get("origin");
    if (origin && !env.FRONTEND_ORIGINS.includes(origin)) throw new AppError(403, "INVALID_ORIGIN", "Request origin is not allowed");
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input.email, input.password);
    if (!result) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    res.setHeader("Set-Cookie", sessionCookie(result.token));
    res.json({ success: true, data: safeIdentity(result.identity), meta: { requestId: res.locals.requestId } });
  } catch (error) { next(error); }
});
authRouter.get("/me", requireAuth, (_req, res) => res.json({ success: true, data: safeIdentity(res.locals.auth!), meta: { requestId: res.locals.requestId } }));
authRouter.get("/csrf", requireAuth, (_req, res) => res.json({ success: true, data: { token: currentCsrfToken(res) }, meta: { requestId: res.locals.requestId } }));
authRouter.post("/logout", async (req, res, next) => {
  try {
    const token = readSessionCookie(req.headers.cookie);
    if (token) {
      const identity = await authService.resolve(token);
      if (identity) {
        res.locals.auth = identity;
        res.locals.sessionToken = token;
        return requireCsrf(req, res, async (error?: unknown) => {
          if (error) return next(error);
          try { await authService.revoke(token); clearSessionCookie(res); res.json({ success: true, data: { loggedOut: true }, meta: { requestId: res.locals.requestId } }); } catch (failure) { next(failure); }
        });
      }
    }
    clearSessionCookie(res);
    res.json({ success: true, data: { loggedOut: true }, meta: { requestId: res.locals.requestId } });
  } catch (error) { next(error); }
});
return authRouter;
}

export const authRouter = createAuthRouter();

function safeIdentity(identity: { userId: string; email: string; workspaceKey: string; workspaceName: string; role: string; expiresAt: string }) {
  return { email: identity.email, workspace: { key: identity.workspaceKey, name: identity.workspaceName, role: identity.role }, expiresAt: identity.expiresAt };
}
