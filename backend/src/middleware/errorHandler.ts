import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.path} was not found` },
    meta: { requestId: res.locals.requestId }
  });
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: error.issues },
      meta: { requestId: res.locals.requestId }
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.status).json({
      success: false,
      error: { code: error.code, message: error.message, ...(error.details === undefined ? {} : { details: error.details }) },
      meta: { requestId: res.locals.requestId }
    });
    return;
  }

  const stack = error instanceof Error ? error.stack : undefined;
  logger.error({ err: error, requestId: res.locals.requestId, method: req.method, path: req.path }, "Unhandled request error");
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: error instanceof Error && error.message ? error.message : "An unexpected error occurred",
      ...(env.NODE_ENV !== "production" && stack ? { details: { requestId: res.locals.requestId, stack } } : {})
    },
    meta: { requestId: res.locals.requestId }
  });
}
