import { z } from "zod";
export const aiObjectId=z.string().regex(/^[a-f\d]{24}$/i,"Invalid ObjectId");
const ids=(max:number)=>z.array(aiObjectId).max(max).default([]).transform(values=>[...new Set(values)]);
export const contextSelectionSchema=z.object({searchJobIds:ids(5),savedIds:ids(20),collectionIds:ids(5),watchlistIds:ids(5),changeIds:ids(20),includeAnalytics:z.boolean().default(false)}).strict().superRefine((value,ctx)=>{const count=value.searchJobIds.length+value.savedIds.length+value.collectionIds.length+value.watchlistIds.length+value.changeIds.length+(value.includeAnalytics?1:0);if(count>30)ctx.addIssue({code:"custom",message:"Context selection cannot exceed 30 references"})});
export const createAISessionSchema=z.object({title:z.string().trim().min(1).max(120),contextSelection:contextSelectionSchema.default({searchJobIds:[],savedIds:[],collectionIds:[],watchlistIds:[],changeIds:[],includeAnalytics:false})}).strict();
export const updateAISessionSchema=z.object({title:z.string().trim().min(1).max(120).optional(),contextSelection:contextSelectionSchema.optional()}).strict().refine(value=>value.title!==undefined||value.contextSelection!==undefined);
export const aiPageSchema=z.object({cursor:aiObjectId.optional(),limit:z.coerce.number().int().min(1).max(50).default(20)}).strict();
export const createAIMessageSchema=z.object({content:z.string().trim().min(1).max(4000),clientRequestId:z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9_-]+$/)}).strict();
