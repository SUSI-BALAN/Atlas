import { Router } from "express";
import { workspaceService, type WorkspaceService } from "../services/workspace.service.js";
import { collectionCreateSchema, collectionUpdateSchema, objectId, pageSchema } from "../validators/workspace.validator.js";

type Service = Pick<WorkspaceService,"createCollection"|"listCollections"|"getCollection"|"updateCollection"|"deleteCollection"|"addMembership"|"removeMembership"|"list">;
export function createCollectionsRouter(service: Service=workspaceService){const router=Router();
  router.post("/",async(req,res,next)=>{try{res.status(201).json({success:true,data:await service.createCollection(collectionCreateSchema.parse(req.body)),meta:{requestId:res.locals.requestId}});}catch(error){next(error);}});
  router.get("/",async(_req,res,next)=>{try{res.json({success:true,data:await service.listCollections(),meta:{requestId:res.locals.requestId}});}catch(error){next(error);}});
  router.get("/:collectionId",async(req,res,next)=>{try{objectId.parse(req.params.collectionId);res.json({success:true,data:await service.getCollection(req.params.collectionId),meta:{requestId:res.locals.requestId}});}catch(error){next(error);}});
  router.get("/:collectionId/repositories",async(req,res,next)=>{try{objectId.parse(req.params.collectionId);await service.getCollection(req.params.collectionId);const page=pageSchema.parse(req.query);res.json({success:true,data:await service.list({...page,collection:req.params.collectionId}),meta:{requestId:res.locals.requestId}});}catch(error){next(error);}});
  router.patch("/:collectionId",async(req,res,next)=>{try{objectId.parse(req.params.collectionId);res.json({success:true,data:await service.updateCollection(req.params.collectionId,collectionUpdateSchema.parse(req.body)),meta:{requestId:res.locals.requestId}});}catch(error){next(error);}});
  router.delete("/:collectionId",async(req,res,next)=>{try{objectId.parse(req.params.collectionId);res.json({success:true,data:await service.deleteCollection(req.params.collectionId),meta:{requestId:res.locals.requestId}});}catch(error){next(error);}});
  router.post("/:collectionId/repositories/:savedId",async(req,res,next)=>{try{objectId.parse(req.params.collectionId);objectId.parse(req.params.savedId);res.status(201).json({success:true,data:await service.addMembership(req.params.collectionId,req.params.savedId),meta:{requestId:res.locals.requestId}});}catch(error){next(error);}});
  router.delete("/:collectionId/repositories/:savedId",async(req,res,next)=>{try{objectId.parse(req.params.collectionId);objectId.parse(req.params.savedId);res.json({success:true,data:await service.removeMembership(req.params.collectionId,req.params.savedId),meta:{requestId:res.locals.requestId}});}catch(error){next(error);}});return router;}
export const collectionsRouter=createCollectionsRouter();
