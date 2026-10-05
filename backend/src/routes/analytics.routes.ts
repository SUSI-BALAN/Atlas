import { Router } from "express";
import { analyticsService, type AnalyticsService } from "../services/analytics/analytics.service.js";
import { analyticsListQuerySchema, analyticsRangeQuerySchema } from "../validators/analytics.validator.js";

export function createAnalyticsRouter(service: AnalyticsService = analyticsService) {
  const router = Router();
  const endpoint = (handler: (query: any) => Promise<unknown>, ranged = false) => async (req: any, res: any, next: any) => {
    try {
      const query = (ranged ? analyticsRangeQuerySchema : analyticsListQuerySchema).parse(req.query);
      res.json({ success: true, data: await handler(query), meta: { requestId: res.locals.requestId } });
    } catch (error) { next(error); }
  };
  router.get("/summary", endpoint(query => service.summary(query), true));
  router.get("/sources", endpoint(() => service.sources()));
  router.get("/languages", endpoint(query => service.languages(query.limit)));
  router.get("/saved", endpoint(query => service.saved(query.limit)));
  router.get("/collections", endpoint(query => service.collections(query.limit)));
  router.get("/watchlists", endpoint(query => service.watchlists(query), true));
  router.get("/changes", endpoint(query => service.changes(query), true));
  router.get("/searches", endpoint(query => service.searches(query), true));
  return router;
}

export const analyticsRouter = createAnalyticsRouter();
