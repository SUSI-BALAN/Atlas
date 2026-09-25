import { Router } from "express";
import { getDatabaseHealth } from "../database/mongoose.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  const database = getDatabaseHealth();
  res.json({
    success: true,
    data: {
      status: database.ready ? "healthy" : "degraded",
      database: database.status,
      databaseReady: database.ready,
      databaseError: database.lastError,
      version: "0.1.0",
      timestamp: new Date().toISOString()
    },
    meta: { requestId: res.locals.requestId }
  });
});

healthRouter.get("/ready", (_req, res) => {
  const database = getDatabaseHealth();
  res.status(database.ready ? 200 : 503).json({
    success: database.ready,
    data: { status: database.ready ? "ready" : "not_ready", database: database.status, databaseReady: database.ready },
    ...(database.ready ? {} : { error: { code: "DATABASE_UNAVAILABLE", message: "MongoDB is not ready" } }),
    meta: { requestId: res.locals.requestId }
  });
});
