import { describe, expect, it } from "vitest";
import { AIResearchMessageModel, AIResearchSessionModel } from "./aiResearch.model.js";

describe("AI research model indexes", () => {
  it("supports stable workspace session pagination", () => {
    expect(AIResearchSessionModel.schema.indexes()).toContainEqual([
      { workspaceKey: 1, updatedAt: -1, _id: -1 },
      expect.any(Object)
    ]);
  });

  it("supports ordered message history and idempotent generation", () => {
    const indexes = AIResearchMessageModel.schema.indexes();
    expect(indexes).toContainEqual([
      { workspaceKey: 1, sessionId: 1, createdAt: 1, _id: 1 },
      expect.any(Object)
    ]);
    expect(indexes).toContainEqual([
      { workspaceKey: 1, sessionId: 1, clientRequestId: 1 },
      expect.objectContaining({ unique: true })
    ]);
    expect(indexes).toContainEqual([
      { workspaceKey: 1, sessionId: 1, inReplyTo: 1 },
      expect.objectContaining({ unique: true })
    ]);
  });
});
