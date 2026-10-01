import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { AppError, createErrorHandler } from "./errorHandler.js";
import { requestId } from "./requestId.js";

function errorApp(error: Error) {
  const app = express();
  app.use(requestId);
  app.get("/failure", () => { throw error; });
  app.use(createErrorHandler("production"));
  return app;
}

describe("production error handling", () => {
  it("hides unexpected error messages and stacks while preserving request IDs", async () => {
    const response = await request(errorApp(new Error("mongodb://private-host/internal"))).get("/failure");
    expect(response.status).toBe(500);
    expect(response.body.error).toEqual({ code: "INTERNAL_ERROR", message: "An unexpected error occurred" });
    expect(response.body.meta.requestId).toBeTruthy();
    expect(JSON.stringify(response.body)).not.toContain("private-host");
    expect(JSON.stringify(response.body)).not.toContain("stack");
  });

  it("preserves intentional application errors", async () => {
    const response = await request(errorApp(new AppError(409, "EXPECTED_CONFLICT", "Safe conflict"))).get("/failure");
    expect(response.status).toBe(409);
    expect(response.body.error).toEqual({ code: "EXPECTED_CONFLICT", message: "Safe conflict" });
    expect(response.body.meta.requestId).toBeTruthy();
  });
});
