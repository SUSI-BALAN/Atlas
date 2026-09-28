import { Router } from "express";
import { z } from "zod";
import { searchJobService } from "../composition.js";
import type { SearchJobService } from "../services/searchJobs/searchJob.service.js";
import { repositorySources } from "../types/repositorySearch.js";
import { jobResultsQuerySchema, searchJobSchema } from "../validators/searchJob.validator.js";

type SearchJobsService = Pick<SearchJobService, "create" | "get" | "results" | "cancel" | "retrySource">;

export function createSearchJobsRouter(service: SearchJobsService = searchJobService) {
  const router = Router();

  router.post("/", async (req, res, next) => {
    try {
      const input = searchJobSchema.parse(req.body);
      const job = await service.create(input, res.locals.requestId);
      res.status(job.cached ? 200 : 202).json({ success: true, data: job, meta: { requestId: res.locals.requestId } });
    } catch (error) { next(error); }
  });

  router.get("/:jobId", async (req, res, next) => {
    try { res.json({ success: true, data: await service.get(req.params.jobId), meta: { requestId: res.locals.requestId } }); } catch (error) { next(error); }
  });

  router.get("/:jobId/results", async (req, res, next) => {
    try {
      const query = jobResultsQuerySchema.parse(req.query);
      res.json({ success: true, data: await service.results(req.params.jobId, query.cursor, query.limit), meta: { requestId: res.locals.requestId } });
    } catch (error) { next(error); }
  });

  router.post("/:jobId/cancel", async (req, res, next) => {
    try { res.json({ success: true, data: await service.cancel(req.params.jobId), meta: { requestId: res.locals.requestId } }); } catch (error) { next(error); }
  });

  router.post("/:jobId/sources/:source/retry", async (req, res, next) => {
    try {
      const source = z.enum(repositorySources).parse(req.params.source);
      res.status(202).json({ success: true, data: await service.retrySource(req.params.jobId, source, res.locals.requestId), meta: { requestId: res.locals.requestId } });
    } catch (error) { next(error); }
  });

  router.get("/:jobId/export", async (req, res, next) => {
    try {
      const format = z.enum(["json", "csv"]).default("json").parse(req.query.format);
      await service.get(req.params.jobId);
      res.setHeader("Content-Disposition", `attachment; filename=atlas-${req.params.jobId}.${format}`);
      res.setHeader("Content-Type", format === "json" ? "application/json; charset=utf-8" : "text/csv; charset=utf-8");
      let cursor: string | undefined;
      let first = true;
      if (format === "json") res.write("["); else res.write("source,externalId,owner,name,fullName,description,repositoryUrl,language,stars,forks,updatedAt\n");
      do {
        const page = await service.results(req.params.jobId, cursor, 100);
        for (const repository of page.results) {
          if (format === "json") { res.write(`${first ? "" : ","}${JSON.stringify(repository)}`); first = false; }
          else res.write(csvRow([repository.source, repository.externalId, repository.owner, repository.name, repository.fullName, repository.description, repository.repositoryUrl, repository.language, repository.stars, repository.forks, repository.updatedAt]));
        }
        cursor = page.nextCursor ?? undefined;
        if (!page.hasMore) break;
      } while (cursor && !res.destroyed);
      if (format === "json") res.write("]");
      res.end();
    } catch (error) { if (!res.headersSent) next(error); else res.end(); }
  });

  return router;
}

export const searchJobsRouter = createSearchJobsRouter();

function csvRow(values: unknown[]): string { return `${values.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")}\n`; }
