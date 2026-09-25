import { Router } from "express";
import { connectorRegistry } from "../composition.js";
import { logger } from "../config/logger.js";
import type { PlatformConnector } from "../connectors/core/connector.interface.js";
import { AppError } from "../middleware/errorHandler.js";

export const connectorsRouter = Router();

function publicMetadata(connector: PlatformConnector, requestId: string | undefined) {
  const metadata = {
    id: connector.id, name: connector.name, version: connector.version,
    homepageUrl: connector.homepageUrl, accessMethod: connector.accessMethod,
    enabled: connector.enabled, authentication: connector.authentication,
    capabilities: connector.capabilities
  };
  try {
    return { ...metadata, health: connector.getHealth(), rateLimit: connector.getRateLimitStatus() };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error({ err: error, connectorId: connector.id, connectorName: connector.name, reason, requestId }, "Connector status read failed");
    return {
      ...metadata,
      health: { status: "unavailable" as const, message: `${connector.name} status unavailable: ${reason}`, lastSuccessfulRequestAt: null },
      rateLimit: { limit: null, remaining: null, resetAt: null, retryAfterSeconds: null }
    };
  }
}

connectorsRouter.get("/", (_req, res) => {
  res.json({ success: true, data: connectorRegistry.list().map((connector) => publicMetadata(connector, res.locals.requestId)), meta: { requestId: res.locals.requestId } });
});

connectorsRouter.get("/:id", (req, res) => {
  const connector = connectorRegistry.get(req.params.id);
  if (!connector) throw new AppError(404, "CONNECTOR_NOT_FOUND", `Connector '${req.params.id}' was not found`);
  res.json({ success: true, data: publicMetadata(connector, res.locals.requestId), meta: { requestId: res.locals.requestId } });
});
