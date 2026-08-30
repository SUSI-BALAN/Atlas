import { Router } from "express";
import { getDatabaseStatus } from "../database/mongoose.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  const database = getDatabaseStatus();
  res.json({
    success: true,
    data: {
      status: database === "connected" ? "healthy" : "degraded",
      database,
      version: "0.1.0",
      timestamp: new Date().toISOString()
    },
    meta: { requestId: res.locals.requestId }
  });
});
