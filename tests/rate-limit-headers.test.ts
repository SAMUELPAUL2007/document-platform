import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimit, applyRateLimitHeaders } from "../lib/rate-limit";

describe("Rate Limit Headers", () => {
  beforeEach(() => {
    resetRateLimit();
  });

  it("returns correct limit field matching policy", () => {
    const result = checkRateLimit("hdr-test-1", { windowMs: 60_000, maxRequests: 10 });
    expect(result.limit).toBe(10);
  });

  it("returns correct limit for different policies", () => {
    const r1 = checkRateLimit("hdr-test-2", { windowMs: 60_000, maxRequests: 5 });
    expect(r1.limit).toBe(5);
    const r2 = checkRateLimit("hdr-test-3", { windowMs: 60_000, maxRequests: 20 });
    expect(r2.limit).toBe(20);
  });

  it("remaining never goes negative", () => {
    const policy = { windowMs: 60_000, maxRequests: 2 };
    checkRateLimit("hdr-neg", policy);
    checkRateLimit("hdr-neg", policy);
    const blocked = checkRateLimit("hdr-neg", policy);
    expect(blocked.remaining).toBe(0);
    expect(blocked.allowed).toBe(false);
  });

  it("resetAt is a future timestamp", () => {
    const result = checkRateLimit("hdr-reset", { windowMs: 60_000, maxRequests: 5 });
    expect(result.resetAt).toBeDefined();
    expect(result.resetAt!).toBeGreaterThan(Date.now());
  });

  it("applyRateLimitHeaders sets correct headers", () => {
    const result = checkRateLimit("hdr-headers", { windowMs: 60_000, maxRequests: 15 });
    const headers: Record<string, string> = {};
    const mockRes = { setHeader: (k: string, v: string) => { headers[k] = v; } };
    applyRateLimitHeaders(mockRes, result);
    expect(headers["X-RateLimit-Limit"]).toBe("15");
    expect(headers["X-RateLimit-Remaining"]).toBe("14");
  });

  it("applyRateLimitHeaders sets Retry-After when blocked", () => {
    const policy = { windowMs: 60_000, maxRequests: 1 };
    checkRateLimit("hdr-retry", policy);
    const blocked = checkRateLimit("hdr-retry", policy);
    expect(blocked.allowed).toBe(false);
    const headers: Record<string, string> = {};
    const mockRes = { setHeader: (k: string, v: string) => { headers[k] = v; } };
    applyRateLimitHeaders(mockRes, blocked);
    expect(headers["Retry-After"]).toBeDefined();
    expect(Number(headers["Retry-After"])).toBeGreaterThan(0);
    expect(headers["X-RateLimit-Reset"]).toBeDefined();
  });

  it("applyRateLimitHeaders does not set Retry-After when allowed", () => {
    const result = checkRateLimit("hdr-ok", { windowMs: 60_000, maxRequests: 5 });
    const headers: Record<string, string> = {};
    const mockRes = { setHeader: (k: string, v: string) => { headers[k] = v; } };
    applyRateLimitHeaders(mockRes, result);
    expect(headers["Retry-After"]).toBeUndefined();
    expect(headers["X-RateLimit-Reset"]).toBeUndefined();
    expect(headers["X-RateLimit-Limit"]).toBe("5");
  });
});
