import { Schema, model } from "mongoose";

const rawItemSchema = new Schema({
  source: { type: String, required: true, index: true },
  sourceId: { type: String, required: true },
  sourceType: { type: String, required: true },
  sourceUrl: { type: String, required: true },
  connectorVersion: { type: String, required: true },
  requestId: { type: String, required: true, index: true },
  jobId: { type: String, default: null },
  data: { type: Schema.Types.Mixed, required: true },
  collectedAt: { type: Date, required: true, default: Date.now },
  expiresAt: { type: Date, default: null }
}, { timestamps: false, minimize: false });

rawItemSchema.index({ source: 1, sourceId: 1, collectedAt: -1 });
rawItemSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: "date" } } });

export const RawItemModel = model("RawItem", rawItemSchema);
