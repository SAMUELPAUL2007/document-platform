import { describe, it, expect } from "vitest";
import {
  validateExtension,
  validateMimeType,
  validateFileSize,
  validateFileSignature,
  validateFile,
  getMimeTypeFromExtension,
} from "../lib/processing/validators";

describe("validateExtension", () => {
  it("accepts valid extensions", () => {
    expect(validateExtension("photo.jpg", ".jpg,.png,.webp").valid).toBe(true);
    expect(validateExtension("doc.pdf", ".pdf").valid).toBe(true);
    expect(validateExtension("image.PNG", ".png").valid).toBe(true);
  });

  it("rejects invalid extensions", () => {
    expect(validateExtension("script.exe", ".pdf").valid).toBe(false);
    expect(validateExtension("photo.bmp", ".jpg,.png").valid).toBe(false);
  });

  it("allows all files when accept is empty", () => {
    expect(validateExtension("anything.xyz", "").valid).toBe(true);
  });

  it("rejects files without extensions", () => {
    expect(validateExtension("noext", ".pdf").valid).toBe(false);
  });
});

describe("validateMimeType", () => {
  it("accepts matching MIME types", () => {
    expect(validateMimeType("photo.jpg", "image/jpeg", ".jpg,.png").valid).toBe(true);
  });

  it("rejects mismatched MIME types", () => {
    const result = validateMimeType("photo.jpg", "application/pdf", ".jpg,.png");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("MIME type");
  });

  it("skips validation when accept list is empty", () => {
    expect(validateMimeType("file.exe", "application/octet-stream", "").valid).toBe(true);
  });
});

describe("validateFileSize", () => {
  it("accepts files within size limit", () => {
    expect(validateFileSize(1024, 1024 * 1024).valid).toBe(true);
    expect(validateFileSize(100 * 1024 * 1024, 100 * 1024 * 1024).valid).toBe(true);
  });

  it("rejects files exceeding size limit", () => {
    expect(validateFileSize(200 * 1024 * 1024, 100 * 1024 * 1024).valid).toBe(false);
  });

  it("rejects empty files", () => {
    expect(validateFileSize(0, 1024).valid).toBe(false);
  });
});

describe("validateFileSignature", () => {
  it("validates JPEG signature", () => {
    const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(validateFileSignature(jpegHeader, "image/jpeg").valid).toBe(true);
  });

  it("validates PNG signature", () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(validateFileSignature(pngHeader, "image/png").valid).toBe(true);
  });

  it("validates PDF signature", () => {
    const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    expect(validateFileSignature(pdfHeader, "application/pdf").valid).toBe(true);
  });

  it("rejects mismatched signatures", () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(validateFileSignature(pngHeader, "image/jpeg").valid).toBe(false);
  });

  it("passes for unknown MIME types", () => {
    const anyBuffer = Buffer.from([0x00, 0x01, 0x02]);
    expect(validateFileSignature(anyBuffer, "application/octet-stream").valid).toBe(true);
  });
});

describe("getMimeTypeFromExtension", () => {
  it("returns correct MIME types", () => {
    expect(getMimeTypeFromExtension("photo.jpg")).toBe("image/jpeg");
    expect(getMimeTypeFromExtension("image.png")).toBe("image/png");
    expect(getMimeTypeFromExtension("doc.pdf")).toBe("application/pdf");
    expect(getMimeTypeFromExtension("doc.docx")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  });

  it("returns null for unknown extensions", () => {
    expect(getMimeTypeFromExtension("file.xyz")).toBeNull();
  });
});

describe("validateFile (integration)", () => {
  it("accepts a valid JPEG file", () => {
    const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const result = validateFile("photo.jpg", "image/jpeg", 1024, jpegHeader, ".jpg,.png", 100 * 1024 * 1024);
    expect(result.valid).toBe(true);
  });

  it("rejects a file with wrong extension", () => {
    const buffer = Buffer.from([0x00, 0x01]);
    const result = validateFile("script.exe", "application/octet-stream", 100, buffer, ".jpg,.png", 100 * 1024 * 1024);
    expect(result.valid).toBe(false);
  });

  it("rejects oversized files", () => {
    const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const result = validateFile("huge.jpg", "image/jpeg", 200 * 1024 * 1024, jpegHeader, ".jpg", 100 * 1024 * 1024);
    expect(result.valid).toBe(false);
  });
});
