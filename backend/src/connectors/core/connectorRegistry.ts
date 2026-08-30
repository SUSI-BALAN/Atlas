import type { PlatformConnector } from "./connector.interface.js";

export class ConnectorRegistry {
  readonly #connectors = new Map<string, PlatformConnector>();

  register(connector: PlatformConnector): void {
    if (this.#connectors.has(connector.id)) {
      throw new Error(`Connector '${connector.id}' is already registered`);
    }
    this.#connectors.set(connector.id, connector);
  }

  get(id: string): PlatformConnector | undefined {
    return this.#connectors.get(id);
  }

  require(id: string): PlatformConnector {
    const connector = this.get(id);
    if (!connector) throw new Error(`Connector '${id}' is not registered`);
    return connector;
  }

  list(): PlatformConnector[] {
    return [...this.#connectors.values()];
  }
}
