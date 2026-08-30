import { Schema, model } from "mongoose";

const normalizedItemSchema = new Schema({
  source: { type: String, required: true },
  sourceId: { type: String, required: true },
  sourceType: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: null },
  url: { type: String, required: true },
  author: { type: Schema.Types.Mixed, default: null },
  metrics: { type: Schema.Types.Mixed, required: true },
  tags: { type: [String], default: [] },
  programmingLanguage: { type: String, default: null },
  sourceCreatedAt: { type: Date, default: null },
  sourceUpdatedAt: { type: Date, default: null },
  publishedAt: { type: Date, default: null },
  collectedAt: { type: Date, required: true },
  rawDataReference: { type: Schema.Types.ObjectId, ref: "RawItem", default: null },
  provenance: { type: Schema.Types.Mixed, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true, minimize: false });

normalizedItemSchema.index({ source: 1, sourceId: 1 }, { unique: true });
normalizedItemSchema.index({ sourceType: 1, sourceUpdatedAt: -1 });
normalizedItemSchema.index({ source: 1, collectedAt: -1 });
normalizedItemSchema.index({ tags: 1 });
normalizedItemSchema.index({ programmingLanguage: 1 });
normalizedItemSchema.index({ "author.username": 1 });
normalizedItemSchema.index(
  { title: "text", description: "text", tags: "text" },
  { default_language: "none", language_override: "searchIndexLanguage" }
);

export const NormalizedItemModel = model("NormalizedItem", normalizedItemSchema);
