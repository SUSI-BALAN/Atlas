import { Router } from "express";
import { connectorRegistry } from "../composition.js";
import { AppError } from "../middleware/errorHandler.js";

export const connectorsRouter = Router();

function publicMetadata(id: string) {
  const connector = connectorRegistry.get(id);
  if (!connector) throw new AppError(404, "CONNECTOR_NOT_FOUND", `Connector '${id}' was not found`);
  return {
    id: connector.id, name: connector.name, version: connector.version,
    capabilities: connector.capabilities, health: connector.getHealth(), rateLimit: connector.getRateLimitStatus()
  };
}

connectorsRouter.get("/", (_req, res) => {
  res.json({ success: true, data: connectorRegistry.list().map((connector) => publicMetadata(connector.id)), meta: { requestId: res.locals.requestId } });
});

connectorsRouter.get("/:id", (req, res) => {
  res.json({ success: true, data: publicMetadata(req.params.id), meta: { requestId: res.locals.requestId } });
});
