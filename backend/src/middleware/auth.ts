import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { authService, csrfForToken, type AuthIdentity } from "../services/auth/auth.service.js";
import { AppError } from "./errorHandler.js";
import { runInWorkspace } from "../services/workspaceContext.js";

declare global { namespace Express { interface Locals { auth?: AuthIdentity; sessionToken?: string; } } }

export function readSessionCookie(header: string | undefined): string | null {
  const value = header?.split(";").map(part => part.trim()).find(part => part.startsWith(`${env.AUTH_COOKIE_NAME}=`));
  return value ? value.slice(env.AUTH_COOKIE_NAME.length + 1) : null;
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const token = readSessionCookie(req.headers.cookie);
    const identity = token ? await authService.resolve(token) : null;
    if (!identity) {
      if (token) clearSessionCookie(res);
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }
    res.locals.auth = identity;
    res.locals.sessionToken = token!;
    runInWorkspace(identity.workspaceKey, () => next());
  } catch (error) { next(error); }
};

export const requireCsrf: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (origin && !env.FRONTEND_ORIGINS.includes(origin)) return next(new AppError(403, "INVALID_ORIGIN", "Request origin is not allowed"));
  const identity = res.locals.auth;
  const token = req.get("x-csrf-token");
  if (!identity || !token || !authService.verifyCsrf(identity, token)) return next(new AppError(403, "INVALID_CSRF", "CSRF token is invalid"));
  next();
};

export function sessionCookie(token: string, secure = env.NODE_ENV === "production"): string {
  return `${env.AUTH_COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${env.AUTH_SESSION_TTL_SECONDS}${secure ? "; Secure" : ""}`;
}
export function clearSessionCookie(res: { setHeader(name: string, value: string): unknown }): void {
  res.setHeader("Set-Cookie", `${env.AUTH_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${env.NODE_ENV === "production" ? "; Secure" : ""}`);
}
export function currentCsrfToken(res: { locals: Express.Locals }): string {
  if (!res.locals.sessionToken) throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  return csrfForToken(res.locals.sessionToken);
}
