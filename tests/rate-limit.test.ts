import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit, resetRateLimit, getRateLimitStore, getToolUploadPolicy, getDownloadPolicy } from "../lib/rate-limit";

describe("Rate Limiter", () => {
  beforeEach(() => {
    resetRateLimit();
  });

  it("allows request within limit", () => {
    const result = checkRateLimit("user1", { windowMs: 60_000, maxRequests: 5 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("rejects request over limit", () => {
    const policy = { windowMs: 60_000, maxRequests: 3 };
    checkRateLimit("user2", policy);
    checkRateLimit("user2", policy);
    checkRateLimit("user2", policy);
    const result = checkRateLimit("user2", policy);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets after window expires", () => {
    const policy = { windowMs: 100, maxRequests: 2 };
    checkRateLimit("user3", policy);
    checkRateLimit("user3", policy);
    const rejected = checkRateLimit("user3", policy);
    expect(rejected.allowed).toBe(false);

    // Wait for window to expire
    const start = Date.now();
    while (Date.now() - start < 150) {}

    const allowed = checkRateLimit("user3", policy);
    expect(allowed.allowed).toBe(true);
    expect(allowed.remaining).toBe(1);
  });

  it("tracks different IPs independently", () => {
    const policy = { windowMs: 60_000, maxRequests: 2 };
    checkRateLimit("ip1", policy);
    checkRateLimit("ip1", policy);

    const ip1Result = checkRateLimit("ip1", policy);
    expect(ip1Result.allowed).toBe(false);

    const ip2Result = checkRateLimit("ip2", policy);
    expect(ip2Result.allowed).toBe(true);
  });

  it("resetRateLimit clears specific identifier", () => {
    const policy = { windowMs: 60_000, maxRequests: 1 };
    checkRateLimit("userA", policy);
    const rejected = checkRateLimit("userA", policy);
    expect(rejected.allowed).toBe(false);

    resetRateLimit("userA");
    const allowed = checkRateLimit("userA", policy);
    expect(allowed.allowed).toBe(true);
  });

  it("resetRateLimit clears all entries", () => {
    const policy = { windowMs: 60_000, maxRequests: 1 };
    checkRateLimit("x", policy);
    checkRateLimit("y", policy);
    resetRateLimit();
    const store = getRateLimitStore();
    expect(store.size).toBe(0);
  });

  it("returns correct retryAfterMs", () => {
    const policy = { windowMs: 5000, maxRequests: 1 };
    checkRateLimit("retry-user", policy);
    const result = checkRateLimit("retry-user", policy);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(5000);
  });

  it("returns remaining count correctly", () => {
    const policy = { windowMs: 60_000, maxRequests: 5 };
    const r1 = checkRateLimit("rem", policy);
    expect(r1.remaining).toBe(4);
    const r2 = checkRateLimit("rem", policy);
    expect(r2.remaining).toBe(3);
    const r3 = checkRateLimit("rem", policy);
    expect(r3.remaining).toBe(2);
  });

  describe("per-tool upload policies", () => {
    it("returns heavy policy for ocr-pdf", () => {
      const policy = getToolUploadPolicy("ocr-pdf");
      expect(policy.maxRequests).toBe(10);
      expect(policy.windowMs).toBe(60_000);
    });

    it("returns heavy policy for compress-pdf", () => {
      const policy = getToolUploadPolicy("compress-pdf");
      expect(policy.maxRequests).toBe(10);
    });

    it("returns normal policy for pdf-to-word", () => {
      const policy = getToolUploadPolicy("pdf-to-word");
      expect(policy.maxRequests).toBe(15);
    });

    it("returns normal policy for images-to-pdf", () => {
      const policy = getToolUploadPolicy("images-to-pdf");
      expect(policy.maxRequests).toBe(15);
    });

    it("returns default policy for unknown tools", () => {
      const policy = getToolUploadPolicy("unknown-tool");
      expect(policy.maxRequests).toBe(20);
    });

    it("heavy tools are rate-limited more strictly", () => {
      const heavy = getToolUploadPolicy("ocr-pdf");
      const normal = getToolUploadPolicy("merge-pdf");
      const defaultPolicy = getToolUploadPolicy("unknown");
      expect(heavy.maxRequests).toBeLessThan(normal.maxRequests);
      expect(normal.maxRequests).toBeLessThanOrEqual(defaultPolicy.maxRequests);
    });
  });

  describe("download policy", () => {
    it("returns 60 requests per minute", () => {
      const policy = getDownloadPolicy();
      expect(policy.maxRequests).toBe(60);
      expect(policy.windowMs).toBe(60_000);
    });

    it("allows 60 downloads within window", () => {
      const policy = getDownloadPolicy();
      for (let i = 0; i < 60; i++) {
        const result = checkRateLimit(`dl-test-${i}`, policy);
        expect(result.allowed).toBe(true);
      }
    });

    it("rejects 61st download", () => {
      const policy = getDownloadPolicy();
      for (let i = 0; i < 60; i++) {
        checkRateLimit("dl-burst", policy);
      }
      const result = checkRateLimit("dl-burst", policy);
      expect(result.allowed).toBe(false);
    });
  });

  describe("env-configurable rate limits", () => {
    it("reads HEAVY_MAX from env when set", () => {
      const original = process.env.RATE_LIMIT_HEAVY_MAX;
      process.env.RATE_LIMIT_HEAVY_MAX = "5";
      // Re-import to pick up new env value
      vi.resetModules();
      return import("../lib/rate-limit").then(({ getToolUploadPolicy }) => {
        const policy = getToolUploadPolicy("ocr-pdf");
        expect(policy.maxRequests).toBe(5);
        if (original !== undefined) {
          process.env.RATE_LIMIT_HEAVY_MAX = original;
        } else {
          delete process.env.RATE_LIMIT_HEAVY_MAX;
        }
        vi.resetModules();
      });
    });

    it("reads NORMAL_MAX from env when set", () => {
      const original = process.env.RATE_LIMIT_NORMAL_MAX;
      process.env.RATE_LIMIT_NORMAL_MAX = "25";
      vi.resetModules();
      return import("../lib/rate-limit").then(({ getToolUploadPolicy }) => {
        const policy = getToolUploadPolicy("images-to-pdf");
        expect(policy.maxRequests).toBe(25);
        if (original !== undefined) {
          process.env.RATE_LIMIT_NORMAL_MAX = original;
        } else {
          delete process.env.RATE_LIMIT_NORMAL_MAX;
        }
        vi.resetModules();
      });
    });

    it("reads DOWNLOAD_MAX from env when set", () => {
      const original = process.env.RATE_LIMIT_DOWNLOAD_MAX;
      process.env.RATE_LIMIT_DOWNLOAD_MAX = "100";
      vi.resetModules();
      return import("../lib/rate-limit").then(({ getDownloadPolicy }) => {
        const policy = getDownloadPolicy();
        expect(policy.maxRequests).toBe(100);
        if (original !== undefined) {
          process.env.RATE_LIMIT_DOWNLOAD_MAX = original;
        } else {
          delete process.env.RATE_LIMIT_DOWNLOAD_MAX;
        }
        vi.resetModules();
      });
    });
  });

  describe("per-entry window cleanup", () => {
    it("respects per-entry window for cleanup", () => {
      const shortPolicy = { windowMs: 100, maxRequests: 1 };
      const longPolicy = { windowMs: 60_000, maxRequests: 1 };

      checkRateLimit("short-entry", shortPolicy);
      checkRateLimit("long-entry", longPolicy);

      const store = getRateLimitStore();
      expect(store.size).toBe(2);

      const start = Date.now();
      while (Date.now() - start < 150) {}

      const shortResult = checkRateLimit("short-entry", shortPolicy);
      expect(shortResult.allowed).toBe(true);

      const longResult = checkRateLimit("long-entry", longPolicy);
      expect(longResult.allowed).toBe(false);
    });
  });
});
