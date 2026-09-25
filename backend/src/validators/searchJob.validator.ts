import { z } from "zod";
import { repositorySources } from "../types/repositorySearch.js";

const date = z.string().datetime({ offset: true });
const filters = z.object({
  language: z.array(z.string().trim().min(1).max(64)).max(10).optional(),
  topic: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
  starsMin: z.number().int().min(0).optional(), starsMax: z.number().int().min(0).optional(),
  createdAfter: date.optional(), createdBefore: date.optional(), updatedAfter: date.optional(),
  license: z.array(z.string().trim().min(1).max(64)).max(10).optional(),
  archived: z.boolean().optional(), owner: z.string().trim().min(1).max(100).optional(), organization: z.string().trim().min(1).max(100).optional()
}).strict().default({});

export const searchJobSchema = z.object({
  query: z.string().trim().min(1).max(256),
  sources: z.union([z.literal("all"), z.array(z.enum(repositorySources)).min(1).max(repositorySources.length)]).default("all"),
  filters,
  sort: z.object({ field: z.enum(["relevance", "stars", "updated", "created"]), direction: z.enum(["asc", "desc"]) }).strict().default({ field: "relevance", direction: "desc" }),
  collectionMode: z.enum(["preview", "expanded", "all"]).default("preview"),
  resultLimit: z.number().int().min(1).max(1_000_000).nullable().optional()
}).strict().superRefine((value, context) => {
  if (value.filters.starsMin !== undefined && value.filters.starsMax !== undefined && value.filters.starsMin > value.filters.starsMax) context.addIssue({ code: "custom", path: ["filters", "starsMin"], message: "starsMin cannot exceed starsMax" });
  if (value.collectionMode === "all" && value.resultLimit === undefined) return;
});

export const jobResultsQuerySchema = z.object({ cursor: z.string().regex(/^[a-f\d]{24}$/i).optional(), limit: z.coerce.number().int().min(1).max(100).default(50) });
