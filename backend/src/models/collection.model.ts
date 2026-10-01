import { Schema, model } from "mongoose";

const collectionSchema = new Schema({
  workspaceKey: { type: String, required: true, default: "default", index: true },
  name: { type: String, required: true }, description: { type: String, required: true, default: "" }
}, { timestamps: true, collection: "collections" });
collectionSchema.index({ workspaceKey: 1, createdAt: -1, _id: -1 });
export const CollectionModel = model("Collection", collectionSchema);

const membershipSchema = new Schema({
  workspaceKey: { type: String, required: true, default: "default" },
  collectionId: { type: Schema.Types.ObjectId, ref: "Collection", required: true },
  savedId: { type: Schema.Types.ObjectId, ref: "SavedRepository", required: true }
}, { timestamps: true, collection: "collection_memberships" });
membershipSchema.index({ workspaceKey: 1, collectionId: 1, savedId: 1 }, { unique: true });
membershipSchema.index({ workspaceKey: 1, savedId: 1, collectionId: 1 });
export const CollectionMembershipModel = model("CollectionMembership", membershipSchema);
