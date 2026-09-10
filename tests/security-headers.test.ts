import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

function makeRequest(path: string): NextRequest {
  return new NextRequest(new Request(`https://example.com${path}`));
}

describe("Security headers middleware", () => {
  it("adds X-Content-Type-Options header", () => {
    const response = middleware(makeRequest("/"));
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("adds X-Frame-Options header", () => {
    const response = middleware(makeRequest("/"));
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("adds X-XSS-Protection header", () => {
    const response = middleware(makeRequest("/"));
    expect(response.headers.get("X-XSS-Protection")).toBe("1; mode=block");
  });

  it("adds Referrer-Policy header", () => {
    const response = middleware(makeRequest("/"));
    expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("adds Permissions-Policy header", () => {
    const response = middleware(makeRequest("/"));
    const policy = response.headers.get("Permissions-Policy");
    expect(policy).toContain("camera=()");
    expect(policy).toContain("microphone=()");
    expect(policy).toContain("geolocation=()");
  });

  it("adds Strict-Transport-Security header", () => {
    const response = middleware(makeRequest("/"));
    expect(response.headers.get("Strict-Transport-Security")).toContain("max-age=");
  });

  it("has a config matcher that excludes static assets", async () => {
    const mod = await import("../middleware");
    expect(mod.config).toBeDefined();
    expect(mod.config.matcher).toBeDefined();
    const pattern = mod.config.matcher[0] as string;
    expect(pattern).toContain("_next/static");
    expect(pattern).toContain("robots.txt");
    expect(pattern).toContain("sitemap.xml");
  });

  it("applies to API routes", () => {
    const response = middleware(makeRequest("/api/health"));
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("applies to tool pages", () => {
    const response = middleware(makeRequest("/merge-pdf"));
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});
