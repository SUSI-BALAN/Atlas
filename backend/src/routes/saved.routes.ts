import { Router } from "express";
import { workspaceService, type WorkspaceService } from "../services/workspace.service.js";
import { objectId, saveRepositorySchema, savedListSchema, savedLookupSchema, updateSavedSchema } from "../validators/workspace.validator.js";

type Service = Pick<WorkspaceService, "save"|"lookup"|"get"|"list"|"update"|"remove"|"summary">;
export function createSavedRouter(service: Service = workspaceService) { const router = Router();
  router.post("/", async (req,res,next) => { try { const input=saveRepositorySchema.parse(req.body); res.status(201).json({success:true,data:await service.save(input.jobId,input.repositoryId),meta:{requestId:res.locals.requestId}}); } catch(error){next(error);} });
  router.get("/lookup", async (req,res,next) => { try { const input=savedLookupSchema.parse(req.query); res.json({success:true,data:await service.lookup(input.source,input.externalId),meta:{requestId:res.locals.requestId}}); } catch(error){next(error);} });
  router.get("/summary", async (_req,res,next) => { try { res.json({success:true,data:await service.summary(),meta:{requestId:res.locals.requestId}}); } catch(error){next(error);} });
  router.get("/", async (req,res,next) => { try { const input=savedListSchema.parse(req.query); res.json({success:true,data:await service.list(input),meta:{requestId:res.locals.requestId}}); } catch(error){next(error);} });
  router.get("/:savedId", async (req,res,next) => { try { objectId.parse(req.params.savedId); res.json({success:true,data:await service.get(req.params.savedId),meta:{requestId:res.locals.requestId}}); } catch(error){next(error);} });
  router.patch("/:savedId", async (req,res,next) => { try { objectId.parse(req.params.savedId); res.json({success:true,data:await service.update(req.params.savedId,updateSavedSchema.parse(req.body)),meta:{requestId:res.locals.requestId}}); } catch(error){next(error);} });
  router.delete("/:savedId", async (req,res,next) => { try { objectId.parse(req.params.savedId); res.json({success:true,data:await service.remove(req.params.savedId),meta:{requestId:res.locals.requestId}}); } catch(error){next(error);} }); return router; }
export const savedRouter=createSavedRouter();
