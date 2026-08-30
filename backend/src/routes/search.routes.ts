import { Router } from "express";
import { searchService } from "../composition.js";
import { searchSchema } from "../validators/search.validator.js";

export const searchRouter = Router();

searchRouter.post("/", async (req, res, next) => {
  try {
    const query = searchSchema.parse(req.body);
    const result = await searchService.search(query, res.locals.requestId);
    res.json({ success: true, data: result, meta: { requestId: res.locals.requestId } });
  } catch (error) {
    next(error);
  }
});
