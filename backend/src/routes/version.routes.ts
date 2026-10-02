import { Router } from "express";
import { env, type Environment } from "../config/env.js";

type ReleaseEnvironment = Pick<Environment, "RENDER_GIT_COMMIT" | "BUILD_ID">;

export function releaseIdentity(environment: ReleaseEnvironment) {
  return {
    version: "0.1.0",
    commit: environment.RENDER_GIT_COMMIT ?? null,
    buildId: environment.BUILD_ID ?? null
  };
}

export const versionRouter = Router();

versionRouter.get("/", (_req, res) => {
  res.json({
    success: true,
    data: releaseIdentity(env),
    meta: { requestId: res.locals.requestId }
  });
});
