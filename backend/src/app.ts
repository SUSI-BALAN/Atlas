import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { createErrorHandler, notFound } from "./middleware/errorHandler.js";
import { requestId } from "./middleware/requestId.js";
import { healthRouter } from "./routes/health.routes.js";
import { connectorsRouter } from "./routes/connectors.routes.js";
import { searchRouter } from "./routes/search.routes.js";
import { searchJobsRouter } from "./routes/searchJobs.routes.js";
import { versionRouter } from "./routes/version.routes.js";
import { savedRouter } from "./routes/saved.routes.js";
import { collectionsRouter } from "./routes/collections.routes.js";
import { watchlistsRouter } from "./routes/watchlists.routes.js";
import { changesRouter } from "./routes/changes.routes.js";
import { analyticsRouter } from "./routes/analytics.routes.js";
import { aiRouter } from "./routes/ai.routes.js";
import { createAuthRouter } from "./routes/auth.routes.js";
import { requireAuth, requireCsrf } from "./middleware/auth.js";

export function createApp(options: { nodeEnv?: "development" | "test" | "production" } = {}) {
  const app = express();
  const nodeEnv = options.nodeEnv ?? env.NODE_ENV;
  if (nodeEnv === "production") app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(requestId);
  app.use(pinoHttp({
    logger,
    customProps: (_req, res) => ({ requestId: res.locals.requestId, releaseCommit: env.RENDER_GIT_COMMIT ?? null })
  }));
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || env.FRONTEND_ORIGINS.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true
  }));
  app.use(express.json({ limit: "256kb" }));
  // The same-origin CDN proxy must never cache personalized JSON or exports.
  app.use("/api", (_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });
  app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false }));

  const searchJobCreationLimit = rateLimit({
    windowMs: 15 * 60_000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({
      success: false,
      error: { code: "RATE_LIMITED", message: "Too many search jobs were requested; try again later" },
      meta: { requestId: res.locals.requestId }
    })
  });

  app.use("/api/health", healthRouter);
  app.use("/api/version", versionRouter);
  app.use("/api/auth", createAuthRouter());
  app.use("/api", requireAuth, requireCsrf);
  app.use("/api/connectors", connectorsRouter);
  app.use("/api/search", searchRouter);
  app.use("/api/search/jobs", (req, res, next) => req.method === "POST" && req.path === "/" ? searchJobCreationLimit(req, res, next) : next(), searchJobsRouter);
  app.use("/api/saved", savedRouter);
  app.use("/api/collections", collectionsRouter);
  const watchCheckLimit=rateLimit({windowMs:15*60_000,limit:10,standardHeaders:"draft-8",legacyHeaders:false});
  app.use("/api/watchlists",(req,res,next)=>req.method==="POST"&&req.path.endsWith("/check")?watchCheckLimit(req,res,next):next(),watchlistsRouter);
  app.use("/api/changes", changesRouter);
  app.use("/api/analytics", analyticsRouter);
  const aiGenerationLimit=rateLimit({windowMs:15*60_000,limit:10,standardHeaders:"draft-8",legacyHeaders:false,handler:(_req,res)=>res.status(429).json({success:false,error:{code:"AI_RATE_LIMITED",message:"Too many AI generation requests; try again later"},meta:{requestId:res.locals.requestId}})});
  app.use("/api/ai",(req,res,next)=>req.method==="POST"&&req.path.endsWith("/messages")?aiGenerationLimit(req,res,next):next(),aiRouter);
  app.use(notFound);
  app.use(createErrorHandler(nodeEnv));
  return app;
}
