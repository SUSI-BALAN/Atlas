import express from "express";
import request from "supertest";
import { describe,expect,it,vi } from "vitest";
import { createErrorHandler,AppError } from "../middleware/errorHandler.js";
import { createSavedRouter } from "./saved.routes.js";
import { createCollectionsRouter } from "./collections.routes.js";
const id="507f1f77bcf86cd799439011",other="507f191e810c19729de860ea";
function appAt(path:string,router:express.Router){const app=express();app.use(express.json());app.use(path,router);app.use(createErrorHandler("test"));return app;}
describe("saved and collection routes",()=>{
 it("saves by trusted persisted reference",async()=>{const save=vi.fn(async()=>({savedId:id}));const app=appAt("/api/saved",createSavedRouter({save} as never));const response=await request(app).post("/api/saved").send({jobId:id,repositoryId:other});expect(response.status).toBe(201);expect(save).toHaveBeenCalledWith(id,other);});
 it("validates notes and deduplicates normalized tags",async()=>{const update=vi.fn(async(_id:string,patch:unknown)=>patch);const app=appAt("/api/saved",createSavedRouter({update} as never));const response=await request(app).patch(`/api/saved/${id}`).send({note:"plain",tags:[" Atlas ","atlas"]});expect(response.status).toBe(200);expect(response.body.data.tags).toEqual(["atlas"]);});
 it("bounds saved pagination and lookup input",async()=>{const list=vi.fn(),lookup=vi.fn();const app=appAt("/api/saved",createSavedRouter({list,lookup} as never));expect((await request(app).get("/api/saved?limit=51")).status).toBe(400);expect((await request(app).get("/api/saved/lookup?source=bad&externalId=1")).status).toBe(400);});
 it("supports collection create and rename",async()=>{const createCollection=vi.fn(async(v:unknown)=>v),updateCollection=vi.fn(async(_id:string,v:unknown)=>v);const app=appAt("/api/collections",createCollectionsRouter({createCollection,updateCollection} as never));expect((await request(app).post("/api/collections").send({name:"Research",description:"x"})).status).toBe(201);expect((await request(app).patch(`/api/collections/${id}`).send({name:"Renamed"})).status).toBe(200);});
 it("adds and removes idempotent membership",async()=>{const addMembership=vi.fn(async()=>({collectionId:id})),removeMembership=vi.fn(async()=>({deleted:true}));const app=appAt("/api/collections",createCollectionsRouter({addMembership,removeMembership} as never));expect((await request(app).post(`/api/collections/${id}/repositories/${other}`)).status).toBe(201);expect((await request(app).delete(`/api/collections/${id}/repositories/${other}`)).status).toBe(200);});
 it("returns safe missing-id errors",async()=>{const get=vi.fn(async()=>{throw new AppError(404,"SAVED_REPOSITORY_NOT_FOUND","Saved repository was not found")});const app=appAt("/api/saved",createSavedRouter({get} as never));const response=await request(app).get(`/api/saved/${id}`);expect(response.status).toBe(404);expect(response.body.error.code).toBe("SAVED_REPOSITORY_NOT_FOUND");});
});
