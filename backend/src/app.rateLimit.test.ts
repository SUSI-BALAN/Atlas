import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("search-job creation rate limiting", () => {
  it("uses the trusted production proxy address without combining unrelated clients", async () => {
    const app = createApp({ nodeEnv: "production" });
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await request(app).post("/api/search/jobs").set("X-Forwarded-For", "203.0.113.10").send({});
      expect(response.status).toBe(400);
    }

    const limited = await request(app).post("/api/search/jobs").set("X-Forwarded-For", "203.0.113.10").send({});
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("RATE_LIMITED");

    const otherClient = await request(app).post("/api/search/jobs").set("X-Forwarded-For", "203.0.113.11").send({});
    expect(otherClient.status).toBe(400);
  });
});
