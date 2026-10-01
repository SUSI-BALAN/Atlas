import { Schema, model } from "mongoose";

const contextSelectionSchema = new Schema({
  searchJobIds: { type: [Schema.Types.ObjectId], default: [] }, savedIds: { type: [Schema.Types.ObjectId], default: [] },
  collectionIds: { type: [Schema.Types.ObjectId], default: [] }, watchlistIds: { type: [Schema.Types.ObjectId], default: [] },
  changeIds: { type: [Schema.Types.ObjectId], default: [] }, includeAnalytics: { type: Boolean, default: false }
}, { _id: false, strict: true });

const sessionSchema = new Schema({
  workspaceKey: { type: String, required: true, default: "default" }, title: { type: String, required: true, trim: true, maxlength: 120 },
  contextSelection: { type: contextSelectionSchema, required: true, default: () => ({}) }
}, { timestamps: true, collection: "ai_research_sessions" });
sessionSchema.index({ workspaceKey: 1, updatedAt: -1, _id: -1 });
export const AIResearchSessionModel = model("AIResearchSession", sessionSchema);

const citationSchema = new Schema({ citationId: String, claim: String, kind: String, label: String, href: String }, { _id: false, strict: true });
const usageSchema = new Schema({ inputTokens: Number, outputTokens: Number, totalTokens: Number }, { _id: false, strict: true });
const messageSchema = new Schema({
  workspaceKey: { type: String, required: true, default: "default" }, sessionId: { type: Schema.Types.ObjectId, required: true },
  role: { type: String, enum: ["user", "assistant"], required: true }, content: { type: String, required: true, maxlength: 12000 },
  citations: { type: [citationSchema], default: [] }, provider: { type: String, default: null }, model: { type: String, default: null },
  usage: { type: usageSchema, default: null }, insufficientContext: { type: Boolean, default: false }, grounded: { type: Boolean, default: false },
  contextTruncated: { type: Boolean, default: false }, clientRequestId: { type: String, default: null },
  inReplyTo: { type: Schema.Types.ObjectId, default: null }, generationStatus: { type: String, enum: ["pending", "completed", "failed"], default: null },
  failureCode: { type: String, default: null }
}, { timestamps: true, collection: "ai_research_messages" });
messageSchema.index({ workspaceKey: 1, sessionId: 1, createdAt: 1, _id: 1 });
messageSchema.index({ workspaceKey: 1, sessionId: 1, clientRequestId: 1 }, { unique: true, partialFilterExpression: { clientRequestId: { $type: "string" } } });
messageSchema.index({ workspaceKey: 1, sessionId: 1, inReplyTo: 1 }, { unique: true, partialFilterExpression: { inReplyTo: { $type: "objectId" } } });
export const AIResearchMessageModel = model("AIResearchMessage", messageSchema);
