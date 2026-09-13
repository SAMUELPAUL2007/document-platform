import { describe, it, expect } from "vitest";
import { GET } from "../app/api/health/route";

describe("Health API", () => {
  it("returns ok or degraded status", async () => {
    const response = await GET();
    const body = await response.json();
    expect(["ok", "degraded"]).toContain(body.status);
    expect(body.timestamp).toBeDefined();
    expect(typeof body.timestamp).toBe("number");
  });

  it("returns 200 when healthy or 503 when degraded", async () => {
    const response = await GET();
    const body = await response.json();
    if (body.status === "ok") {
      expect(response.status).toBe(200);
    } else {
      expect(response.status).toBe(503);
    }
  });

  it("timestamp is recent", async () => {
    const before = Date.now();
    const response = await GET();
    const body = await response.json();
    const after = Date.now();
    expect(body.timestamp).toBeGreaterThanOrEqual(before);
    expect(body.timestamp).toBeLessThanOrEqual(after);
  });

  it("returns dependency status array", async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.dependencies).toBeDefined();
    expect(Array.isArray(body.dependencies)).toBe(true);
    expect(body.dependencies.length).toBe(1);
    expect(body.dependencies[0].name).toBe("libreoffice");
    expect(typeof body.dependencies[0].available).toBe("boolean");
  });

  it("returns X-Request-ID header", async () => {
    const response = await GET();
    const requestId = response.headers.get("X-Request-ID");
    expect(requestId).toBeDefined();
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/);
  });
});
