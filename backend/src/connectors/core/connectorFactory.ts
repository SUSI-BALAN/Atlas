import type { PlatformConnector } from "./connector.interface.js";
import { ConnectorRegistry } from "./connectorRegistry.js";

export class ConnectorFactory {
  constructor(private readonly registry: ConnectorRegistry) {}

  create(id: string): PlatformConnector {
    return this.registry.require(id);
  }
}
