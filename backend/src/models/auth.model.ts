import { Schema, model } from "mongoose";

const userSchema = new Schema({
  emailNormalized: { type: String, required: true },
  emailDisplay: { type: String, required: true },
  passwordHash: { type: String, required: true, select: false },
  status: { type: String, enum: ["active", "disabled"], required: true, default: "active" },
  lastLoginAt: { type: Date, default: null }
}, { timestamps: true, collection: "users" });
userSchema.index({ emailNormalized: 1 }, { unique: true });

const workspaceSchema = new Schema({
  key: { type: String, required: true },
  name: { type: String, required: true }
}, { timestamps: true, collection: "workspaces" });
workspaceSchema.index({ key: 1 }, { unique: true });

const membershipSchema = new Schema({
  workspaceKey: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  role: { type: String, enum: ["owner", "member"], required: true }
}, { timestamps: { createdAt: true, updatedAt: false }, collection: "workspace_memberships" });
membershipSchema.index({ workspaceKey: 1, userId: 1 }, { unique: true });
membershipSchema.index({ userId: 1 });
membershipSchema.index({ workspaceKey: 1, role: 1 }, { unique: true, partialFilterExpression: { role: "owner" } });

const sessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  sessionTokenHash: { type: String, required: true, select: false },
  csrfTokenHash: { type: String, required: true, select: false },
  workspaceKey: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  lastSeenAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null }
}, { timestamps: { createdAt: true, updatedAt: false }, collection: "auth_sessions" });
sessionSchema.index({ sessionTokenHash: 1 }, { unique: true });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ userId: 1 });

export const UserModel = model("User", userSchema);
export const WorkspaceModel = model("Workspace", workspaceSchema);
export const WorkspaceMembershipModel = model("WorkspaceMembership", membershipSchema);
export const AuthSessionModel = model("AuthSession", sessionSchema);
