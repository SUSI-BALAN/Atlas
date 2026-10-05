import { z } from "zod";
import { repositorySources } from "../types/repositorySearch.js";

export const objectId = z.string().regex(/^[a-f\d]{24}$/i);
export const saveRepositorySchema = z.object({ jobId: objectId, repositoryId: objectId }).strict();
const tag = z.string().trim().min(1).max(32).transform((value) => value.toLocaleLowerCase());
export const updateSavedSchema = z.object({ note: z.string().max(4000).optional(), tags: z.array(tag).max(20).transform((values) => [...new Set(values)]).optional() }).strict().refine((value) => value.note !== undefined || value.tags !== undefined);
export const savedListSchema = z.object({ cursor: objectId.optional(), limit: z.coerce.number().int().min(1).max(50).default(20), source: z.enum(repositorySources).optional(), language: z.string().trim().min(1).max(64).optional(), tag: tag.optional(), collection: objectId.optional(), text: z.string().trim().min(1).max(100).optional() });
export const savedLookupSchema = z.object({ source: z.enum(repositorySources), externalId: z.string().trim().min(1).max(256) });
export const collectionCreateSchema = z.object({ name: z.string().trim().min(1).max(100), description: z.string().trim().max(1000).default("") }).strict();
export const collectionUpdateSchema = z.object({ name: z.string().trim().min(1).max(100).optional(), description: z.string().trim().max(1000).optional() }).strict().refine((value) => value.name !== undefined || value.description !== undefined);
export const pageSchema = z.object({ cursor: objectId.optional(), limit: z.coerce.number().int().min(1).max(50).default(20) });
