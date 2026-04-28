import "./setup";
import request from "supertest";
import { createApp } from "../app";

const app = createApp();

describe("GET /api/health", () => {
  it("returns ok with a timestamp and request id", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ok");
    expect(typeof res.body.data.time).toBe("string");
    expect(res.headers["x-request-id"]).toBeDefined();
  });

  it("404s on unknown routes with a structured error", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(res.body.error.requestId).toBeDefined();
  });
});
