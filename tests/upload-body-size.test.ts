import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../app/api/upload/route";

const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const PDF_MIME = "application/pdf";

const OOXML_HEADER = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // PK.. ZIP header

function makeUploadRequest(toolId: string, files: { name: string; size: number; type: string }[] = []) {
  const formData = new FormData();
  formData.set("toolId", toolId);
  for (const f of files) {
    const header = OOXML_HEADER;
    const padding = Math.max(0, f.size - header.length);
    const buf = new ArrayBuffer(f.size);
    const view = new Uint8Array(buf);
    view.set(header.subarray(0, Math.min(header.length, f.size)));
    if (padding > 0) {
      const paddingBuf = new Uint8Array(padding);
      view.set(paddingBuf, header.length);
    }
    const blob = new Blob([buf], { type: f.type });
    formData.append("files", blob, f.name);
  }
  return new NextRequest(new Request("https://example.com/api/upload", {
    method: "POST",
    body: formData,
  }));
}

describe("Upload route security headers (middleware excluded)", () => {
  it("returns security headers on missing toolId (400)", async () => {
    const formData = new FormData();
    formData.set("toolId", "");
    const req = new NextRequest(new Request("https://example.com/api/upload", {
      method: "POST",
      body: formData,
    }));
    const res = await POST(req);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("X-XSS-Protection")).toBe("1; mode=block");
    expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(res.headers.get("Strict-Transport-Security")).toContain("max-age=");
  });

  it("returns security headers on invalid content-type (400)", async () => {
    const req = new NextRequest(new Request("https://example.com/api/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    }));
    const res = await POST(req);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("returns security headers on unsupported tool (400)", async () => {
    const req = makeUploadRequest("nonexistent-tool", [
      { name: "test.pptx", size: 100, type: PPTX_MIME },
    ]);
    const res = await POST(req);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("returns security headers on successful upload (201)", async () => {
    const req = makeUploadRequest("ppt-to-pdf", [
      { name: "test.pptx", size: 1024, type: PPTX_MIME },
    ]);
    const res = await POST(req);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Strict-Transport-Security")).toContain("max-age=");
  });
});

describe("Upload file size boundary validation", () => {
  it("rejects files exceeding MAX_FILE_SIZE (100 MB)", async () => {
    const oversized = 100 * 1024 * 1024 + 1;
    const req = makeUploadRequest("ppt-to-pdf", [
      { name: "huge.pptx", size: oversized, type: PPTX_MIME },
    ]);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/exceeds maximum/i);
  });

  it("accepts files just under MAX_FILE_SIZE boundary (10 MB)", async () => {
    const boundary = 10 * 1024 * 1024;
    const req = makeUploadRequest("ppt-to-pdf", [
      { name: "large.pptx", size: boundary, type: PPTX_MIME },
    ]);
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("accepts files at ~11 MB", async () => {
    const size = 11 * 1024 * 1024;
    const req = makeUploadRequest("ppt-to-pdf", [
      { name: "eleven-mb.pptx", size, type: PPTX_MIME },
    ]);
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("accepts files at ~33.7 MB (regression: original failing size)", async () => {
    const size = Math.round(33.7 * 1024 * 1024);
    const req = makeUploadRequest("ppt-to-pdf", [
      { name: "bioppt.pptx", size, type: PPTX_MIME },
    ]);
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("accepts small files (<1 MB)", async () => {
    const req = makeUploadRequest("ppt-to-pdf", [
      { name: "small.pptx", size: 1024, type: PPTX_MIME },
    ]);
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("accepts files near 100 MB boundary", async () => {
    const nearMax = 99 * 1024 * 1024;
    const req = makeUploadRequest("ppt-to-pdf", [
      { name: "near-max.pptx", size: nearMax, type: PPTX_MIME },
    ]);
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("rejects empty files", async () => {
    const req = makeUploadRequest("ppt-to-pdf", [
      { name: "empty.pptx", size: 0, type: PPTX_MIME },
    ]);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/empty/i);
  });
});

describe("Upload config proxyClientMaxBodySize", () => {
  it("has proxyClientMaxBodySize set in next.config.ts", async () => {
    const { default: nextConfig } = await import("../next.config");
    expect(nextConfig.experimental?.proxyClientMaxBodySize).toBe("100mb");
  });
});
