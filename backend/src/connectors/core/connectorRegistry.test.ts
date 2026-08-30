import { describe, expect, it } from "vitest";
import { ConnectorRegistry } from "./connectorRegistry.js";

describe("ConnectorRegistry", () => {
  it("rejects duplicate connector identifiers", () => {
    const registry = new ConnectorRegistry();
    const connector = { id: "example" } as never;
    registry.register(connector);
    expect(() => registry.register(connector)).toThrow("already registered");
  });
});
