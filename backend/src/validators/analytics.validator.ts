import { z } from "zod";
import { repositorySources } from "../types/repositorySearch.js";

export const analyticsSourceSchema = z.enum(repositorySources);
export const analyticsLimitSchema = z.coerce.number().int().min(1).max(25).default(10);
const isoDate = z.string().datetime({ offset: true });

export const analyticsRangeQuerySchema = z.object({
  from: isoDate.optional(), to: isoDate.optional(), source: analyticsSourceSchema.optional(), limit: analyticsLimitSchema.optional()
}).strict().superRefine((value, context) => {
  const to = value.to ? new Date(value.to) : new Date();
  const from = value.from ? new Date(value.from) : new Date(to.getTime() - 30 * 86_400_000);
  if (from > to) context.addIssue({ code: "custom", message: "from must be before or equal to to", path: ["from"] });
  if (to.getTime() - from.getTime() > 365 * 86_400_000) context.addIssue({ code: "custom", message: "Date range cannot exceed 365 days", path: ["from"] });
}).transform(value => {
  const to = value.to ? new Date(value.to) : new Date();
  const from = value.from ? new Date(value.from) : new Date(to.getTime() - 30 * 86_400_000);
  return { from, to, source: value.source, limit: value.limit ?? 10 };
});

export const analyticsListQuerySchema = z.object({ limit: analyticsLimitSchema.optional() }).strict().transform(value => ({ limit: value.limit ?? 10 }));
