import { z } from "zod";
import { sourceTypes } from "../types/normalizedItem.js";

const date = z.string().datetime({ offset: true });
const filters = z.object({
  language: z.string().trim().min(1).max(64).optional(),
  minStars: z.number().int().min(0).optional(),
  maxStars: z.number().int().min(0).optional(),
  minForks: z.number().int().min(0).optional(),
  maxForks: z.number().int().min(0).optional(),
  author: z.string().trim().min(1).max(100).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  createdAfter: date.optional(), createdBefore: date.optional(),
  updatedAfter: date.optional(), updatedBefore: date.optional()
  ,license: z.string().trim().min(1).max(64).optional(), archived: z.boolean().optional()
}).strict().default({});

export const searchSchema = z.object({
  query: z.string().trim().min(1).max(256),
  sources: z.array(z.string().regex(/^[a-z0-9_-]+$/)).min(1).max(10).default(["github"]),
  types: z.array(z.enum(sourceTypes)).max(sourceTypes.length).default([]),
  filters,
  sort: z.enum(["relevance", "newest", "oldest", "recently_updated", "most_starred", "most_forked", "most_discussed", "source"]).default("relevance"),
  page: z.number().int().min(1).max(100).default(1),
  perPage: z.number().int().min(1).max(50).default(20)
}).strict().superRefine((value, context) => {
  if (value.filters.minStars !== undefined && value.filters.maxStars !== undefined && value.filters.minStars > value.filters.maxStars) {
    context.addIssue({ code: "custom", path: ["filters", "minStars"], message: "minStars cannot exceed maxStars" });
  }
  if (value.filters.minForks !== undefined && value.filters.maxForks !== undefined && value.filters.minForks > value.filters.maxForks) {
    context.addIssue({ code: "custom", path: ["filters", "minForks"], message: "minForks cannot exceed maxForks" });
  }
});
