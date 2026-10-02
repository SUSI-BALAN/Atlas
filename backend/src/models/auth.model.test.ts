import { describe, expect, it } from "vitest";
import { AuthSessionModel, UserModel, WorkspaceMembershipModel, WorkspaceModel } from "./auth.model.js";

describe("auth persistence indexes", () => {
  it("enforces normalized email and stable workspace keys", () => {
    expect(UserModel.schema.indexes()).toEqual(expect.arrayContaining([[{ emailNormalized: 1 }, expect.objectContaining({ unique: true })]]));
    expect(WorkspaceModel.schema.indexes()).toEqual(expect.arrayContaining([[{ key: 1 }, expect.objectContaining({ unique: true })]]));
  });
  it("enforces unique membership and a single default owner", () => {
    expect(WorkspaceMembershipModel.schema.indexes()).toEqual(expect.arrayContaining([[{ workspaceKey: 1, userId: 1 }, expect.objectContaining({ unique: true })]]));
    expect(WorkspaceMembershipModel.schema.indexes()).toEqual(expect.arrayContaining([[{ workspaceKey: 1, role: 1 }, expect.objectContaining({ unique: true })]]));
  });
  it("indexes hashed sessions and expires them with Mongo TTL", () => {
    expect(AuthSessionModel.schema.indexes()).toEqual(expect.arrayContaining([
      [{ sessionTokenHash: 1 }, expect.objectContaining({ unique: true })],
      [{ expiresAt: 1 }, expect.objectContaining({ expireAfterSeconds: 0 })]
    ]));
  });
});
