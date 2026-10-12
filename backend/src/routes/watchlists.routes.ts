import { Router } from "express";
import { watchService } from "../composition.js";
import type { WatchService } from "../services/watch/watch.service.js";
import { createWatchlistSchema, cursorPageSchema, updateWatchlistSchema, watchObjectId } from "../validators/watch.validator.js";
type Service=Pick<WatchService,"create"|"list"|"get"|"update"|"remove"|"addRepository"|"removeRepository"|"repositories"|"startCheck"|"runs">;
export function createWatchlistsRouter(service:Service=watchService){const r=Router();
 r.post("/",async(req,res,next)=>{try{res.status(201).json({success:true,data:await service.create(createWatchlistSchema.parse(req.body)),meta:{requestId:res.locals.requestId}})}catch(e){next(e)}});
 r.get("/",async(req,res,next)=>{try{res.json({success:true,data:await service.list(cursorPageSchema.parse(req.query) as any),meta:{requestId:res.locals.requestId}})}catch(e){next(e)}});
 r.get("/:watchlistId",async(req,res,next)=>{try{watchObjectId.parse(req.params.watchlistId);res.json({success:true,data:await service.get(req.params.watchlistId),meta:{requestId:res.locals.requestId}})}catch(e){next(e)}});
 r.patch("/:watchlistId",async(req,res,next)=>{try{watchObjectId.parse(req.params.watchlistId);res.json({success:true,data:await service.update(req.params.watchlistId,updateWatchlistSchema.parse(req.body)),meta:{requestId:res.locals.requestId}})}catch(e){next(e)}});
 r.delete("/:watchlistId",async(req,res,next)=>{try{watchObjectId.parse(req.params.watchlistId);res.json({success:true,data:await service.remove(req.params.watchlistId),meta:{requestId:res.locals.requestId}})}catch(e){next(e)}});
 r.post("/:watchlistId/repositories/:savedId",async(req,res,next)=>{try{watchObjectId.parse(req.params.watchlistId);watchObjectId.parse(req.params.savedId);res.status(201).json({success:true,data:await service.addRepository(req.params.watchlistId,req.params.savedId),meta:{requestId:res.locals.requestId}})}catch(e){next(e)}});
 r.delete("/:watchlistId/repositories/:savedId",async(req,res,next)=>{try{watchObjectId.parse(req.params.watchlistId);watchObjectId.parse(req.params.savedId);res.json({success:true,data:await service.removeRepository(req.params.watchlistId,req.params.savedId),meta:{requestId:res.locals.requestId}})}catch(e){next(e)}});
 r.get("/:watchlistId/repositories",async(req,res,next)=>{try{watchObjectId.parse(req.params.watchlistId);res.json({success:true,data:await service.repositories(req.params.watchlistId,cursorPageSchema.parse(req.query) as any),meta:{requestId:res.locals.requestId}})}catch(e){next(e)}});
 r.post("/:watchlistId/check",async(req,res,next)=>{try{watchObjectId.parse(req.params.watchlistId);res.status(202).json({success:true,data:await service.startCheck(req.params.watchlistId,res.locals.requestId),meta:{requestId:res.locals.requestId}})}catch(e){next(e)}});
 r.get("/:watchlistId/runs",async(req,res,next)=>{try{watchObjectId.parse(req.params.watchlistId);res.json({success:true,data:await service.runs(req.params.watchlistId,cursorPageSchema.parse(req.query) as any),meta:{requestId:res.locals.requestId}})}catch(e){next(e)}});return r;}
export const watchlistsRouter=createWatchlistsRouter();
