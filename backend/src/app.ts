import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { requestId } from "./middleware/requestId.js";
import { healthRouter } from "./routes/health.routes.js";
import { connectorsRouter } from "./routes/connectors.routes.js";
import { searchRouter } from "./routes/search.routes.js";
import { searchJobsRouter } from "./routes/searchJobs.routes.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(requestId);
  app.use(pinoHttp({ logger }));
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || env.FRONTEND_ORIGINS.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: false
  }));
  app.use(express.json({ limit: "256kb" }));
  app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false }));

  app.use("/api/health", healthRouter);
  app.use("/api/connectors", connectorsRouter);
  app.use("/api/search", searchRouter);
  app.use("/api/search/jobs", searchJobsRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
