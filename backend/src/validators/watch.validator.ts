import { z } from "zod";
import { repositorySources } from "../types/repositorySearch.js";
export const watchObjectId=z.string().regex(/^[a-f\d]{24}$/i,"Invalid ObjectId");
export const createWatchlistSchema=z.object({name:z.string().trim().min(1).max(120),description:z.string().trim().max(2000).default(""),enabled:z.boolean().default(true),checkIntervalMinutes:z.number().int().min(15).max(10080).default(1440)}).strict();
export const updateWatchlistSchema=createWatchlistSchema.partial().refine(v=>Object.keys(v).length>0,"At least one field is required");
export const cursorPageSchema=z.object({cursor:watchObjectId.optional(),limit:z.coerce.number().int().min(1).max(100).default(20)});
export const changesQuerySchema=cursorPageSchema.extend({watchlistId:watchObjectId.optional(),savedId:watchObjectId.optional(),source:z.enum(repositorySources).optional(),changeType:z.enum(["stars","forks","watchers","openIssues","defaultBranch","language","license","archived","visibility","description","topics","sourceUpdatedAt","pushedAt"]).optional(),from:z.coerce.date().optional(),to:z.coerce.date().optional()}).refine(v=>!v.from||!v.to||v.from<=v.to,"from must not be after to");
