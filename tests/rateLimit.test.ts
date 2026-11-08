import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createRateLimit } from "../src/middlewares/rateLimit";

describe("rate limiting", () => {
  it("answers 429 in the API error format after the limit", async () => {
    const app = express();
    app.post("/login", createRateLimit(15, 2, "slow down"), (_, response) => {
      response.json({ ok: true });
    });

    await request(app).post("/login").expect(200);
    await request(app).post("/login").expect(200);
    const limited = await request(app).post("/login").expect(429);

    expect(limited.body).toEqual({ status: 429, message: "slow down", error: "TooManyRequests" });
  });
});
