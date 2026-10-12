import { Router } from "express";import { watchService,type WatchService } from "../composition.js";import { changesQuerySchema,watchObjectId } from "../validators/watch.validator.js";
type Service=Pick<WatchService,"changes"|"change">;
export function createChangesRouter(service:Service=watchService){const router=Router();
router.get("/",async(req,res,next)=>{try{res.json({success:true,data:await service.changes(changesQuerySchema.parse(req.query)),meta:{requestId:res.locals.requestId}})}catch(e){next(e)}});
router.get("/:changeId",async(req,res,next)=>{try{watchObjectId.parse(req.params.changeId);res.json({success:true,data:await service.change(req.params.changeId),meta:{requestId:res.locals.requestId}})}catch(e){next(e)}});return router;}
export const changesRouter=createChangesRouter();
