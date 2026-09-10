import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PDFDocument } from "pdf-lib";
import { mkdir, writeFile, rm, readFile } from "fs/promises";
import { join } from "path";
import { pdfToJpgConverter, pdfToPngConverter } from "../lib/processing/converters/pdf-to-image";
import type { ConverterInput } from "../lib/processing/types";

const TEST_DIR = join(process.cwd(), ".tmp", "test-pdf-to-image");

beforeAll(async () => {
  await mkdir(TEST_DIR, { recursive: true });
});

afterAll(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

async function createTestPdf(
  name: string,
  pageCount: number
): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.addPage([595.28, 841.89]);
    page.drawText(`Page ${i + 1}`, { x: 50, y: 700, size: 24 });
  }
  const pdfBytes = await pdfDoc.save();
  const filePath = join(TEST_DIR, name);
  await writeFile(filePath, pdfBytes);
  return filePath;
}

function makeInput(
  options?: Record<string, string>
): ConverterInput {
  return {
    jobDir: TEST_DIR,
    files: [
      {
        id: "test-pdf-img",
        originalName: "test.pdf",
        storedName: "test.pdf",
        mimeType: "application/pdf",
        size: 1000,
      },
    ],
    options,
  };
}

describe("pdf-to-image converter", () => {
  it("converts a single-page PDF to JPG", async () => {
    await createTestPdf("test.pdf", 1);
    const input = makeInput({ scale: "1" });

    const result = await pdfToJpgConverter.convert(input);

    expect(result.outputMimeType).toBe("image/jpeg");
    expect(result.outputFileName).toMatch(/\.jpg$/);

    const buffer = await readFile(result.outputPath);
    expect(buffer.length).toBeGreaterThan(0);

    const { default: sharp } = await import("sharp");
    const meta = await sharp(buffer).metadata();
    expect(meta.format).toBe("jpeg");
  });

  it("converts a multi-page PDF to PNG zip", async () => {
    await createTestPdf("multi.pdf", 3);
    const input: ConverterInput = {
      jobDir: TEST_DIR,
      files: [
        {
          id: "test-multi",
          originalName: "multi.pdf",
          storedName: "multi.pdf",
          mimeType: "application/pdf",
          size: 2000,
        },
      ],
      options: { scale: "1" },
    };

    const result = await pdfToPngConverter.convert(input);

    expect(result.outputMimeType).toBe("application/zip");
    expect(result.outputFileName).toMatch(/\.zip$/);

    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(await readFile(result.outputPath));
    const files = Object.keys(zip.files).filter((f) => !zip.files[f]?.dir);
    expect(files.length).toBe(3);
  });

  it("extracts specific pages", async () => {
    await createTestPdf("pages.pdf", 5);
    const input = makeInput({ pages: "1, 3, 5", scale: "1" });

    const result = await pdfToJpgConverter.convert(input);

    expect(result.outputMimeType).toBe("image/jpeg");
    expect(result.outputFileName).toMatch(/page_001/);
  });

  it("has correct converter ID and accepted types", () => {
    expect(pdfToJpgConverter.id).toBe("pdf-to-jpg");
    expect(pdfToJpgConverter.acceptedTypes).toContain("application/pdf");
    expect(pdfToPngConverter.id).toBe("pdf-to-png");
    expect(pdfToPngConverter.acceptedTypes).toContain("application/pdf");
  });
});
