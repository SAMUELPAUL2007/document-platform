import { describe, it, expect, beforeAll, afterAll } from "vitest";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { mkdir, writeFile, rm, readFile } from "fs/promises";
import { join } from "path";
import imageToPdfConverter from "../lib/processing/converters/image-to-pdf";
import type { ConverterInput } from "../lib/processing/types";

const TEST_DIR = join(process.cwd(), ".tmp", "test-image-to-pdf");

beforeAll(async () => {
  await mkdir(TEST_DIR, { recursive: true });
});

afterAll(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

async function createTestImage(
  name: string,
  width: number,
  height: number,
  color: { r: number; g: number; b: number }
): Promise<string> {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: color },
  })
    .jpeg()
    .toBuffer();

  const filePath = join(TEST_DIR, name);
  await writeFile(filePath, buffer);
  return filePath;
}

describe("image-to-pdf converter", () => {
  it("converts a single JPEG to PDF with A4 pages", async () => {
    await createTestImage("test1.jpg", 800, 600, { r: 255, g: 0, b: 0 });

    const input: ConverterInput = {
      jobDir: TEST_DIR,
      files: [
        {
          id: "test-1",
          originalName: "test1.jpg",
          storedName: "test1.jpg",
          mimeType: "image/jpeg",
          size: 1000,
        },
      ],
      options: { pageSize: "a4" },
    };

    const result = await imageToPdfConverter.convert(input);

    expect(result.outputFileName).toBe("test1.pdf");
    expect(result.outputMimeType).toBe("application/pdf");

    const pdfBuffer = await readFile(result.outputPath);
    expect(pdfBuffer.length).toBeGreaterThan(0);

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    expect(pages.length).toBe(1);

    const page = pages[0];
    expect(page.getWidth()).toBeCloseTo(595.28, 0);
    expect(page.getHeight()).toBeCloseTo(841.89, 0);
  });

  it("converts multiple images to multi-page PDF", async () => {
    await createTestImage("multi1.jpg", 400, 300, { r: 0, g: 255, b: 0 });
    await createTestImage("multi2.png", 600, 400, { r: 0, g: 0, b: 255 });

    const input: ConverterInput = {
      jobDir: TEST_DIR,
      files: [
        {
          id: "test-2a",
          originalName: "multi1.jpg",
          storedName: "multi1.jpg",
          mimeType: "image/jpeg",
          size: 500,
        },
        {
          id: "test-2b",
          originalName: "multi2.png",
          storedName: "multi2.png",
          mimeType: "image/png",
          size: 600,
        },
      ],
      options: { pageSize: "a4" },
    };

    const result = await imageToPdfConverter.convert(input);

    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    expect(pages.length).toBe(2);
  });

  it("supports Letter page size", async () => {
    await createTestImage("letter.jpg", 1024, 768, { r: 128, g: 128, b: 128 });

    const input: ConverterInput = {
      jobDir: TEST_DIR,
      files: [
        {
          id: "test-3",
          originalName: "letter.jpg",
          storedName: "letter.jpg",
          mimeType: "image/jpeg",
          size: 800,
        },
      ],
      options: { pageSize: "letter" },
    };

    const result = await imageToPdfConverter.convert(input);

    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const page = pdfDoc.getPages()[0];

    expect(page.getWidth()).toBeCloseTo(612, 0);
    expect(page.getHeight()).toBeCloseTo(792, 0);
  });

  it("preserves image ordering", async () => {
    await createTestImage("order1.jpg", 200, 200, { r: 100, g: 0, b: 0 });
    await createTestImage("order2.jpg", 200, 200, { r: 0, g: 100, b: 0 });
    await createTestImage("order3.jpg", 200, 200, { r: 0, g: 0, b: 100 });

    const input: ConverterInput = {
      jobDir: TEST_DIR,
      files: [
        {
          id: "test-4a",
          originalName: "order1.jpg",
          storedName: "order1.jpg",
          mimeType: "image/jpeg",
          size: 200,
        },
        {
          id: "test-4b",
          originalName: "order2.jpg",
          storedName: "order2.jpg",
          mimeType: "image/jpeg",
          size: 200,
        },
        {
          id: "test-4c",
          originalName: "order3.jpg",
          storedName: "order3.jpg",
          mimeType: "image/jpeg",
          size: 200,
        },
      ],
      options: { pageSize: "a4" },
    };

    const result = await imageToPdfConverter.convert(input);

    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPages().length).toBe(3);
  });

  it("handles original page size (matches image dimensions)", async () => {
    await createTestImage("original.jpg", 500, 350, { r: 200, g: 100, b: 50 });

    const input: ConverterInput = {
      jobDir: TEST_DIR,
      files: [
        {
          id: "test-5",
          originalName: "original.jpg",
          storedName: "original.jpg",
          mimeType: "image/jpeg",
          size: 400,
        },
      ],
      options: { pageSize: "original" },
    };

    const result = await imageToPdfConverter.convert(input);

    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const page = pdfDoc.getPages()[0];

    expect(page.getWidth()).toBeCloseTo(500, 0);
    expect(page.getHeight()).toBeCloseTo(350, 0);
  });

  it("applies cover fit mode", async () => {
    await createTestImage("cover.jpg", 800, 600, { r: 100, g: 200, b: 50 });

    const input: ConverterInput = {
      jobDir: TEST_DIR,
      files: [
        {
          id: "test-cover",
          originalName: "cover.jpg",
          storedName: "cover.jpg",
          mimeType: "image/jpeg",
          size: 500,
        },
      ],
      options: { pageSize: "a4", fit: "cover" },
    };

    const result = await imageToPdfConverter.convert(input);
    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPages().length).toBe(1);
  });

  it("applies fill fit mode", async () => {
    await createTestImage("fill.jpg", 800, 600, { r: 50, g: 100, b: 200 });

    const input: ConverterInput = {
      jobDir: TEST_DIR,
      files: [
        {
          id: "test-fill",
          originalName: "fill.jpg",
          storedName: "fill.jpg",
          mimeType: "image/jpeg",
          size: 500,
        },
      ],
      options: { pageSize: "a4", fit: "fill" },
    };

    const result = await imageToPdfConverter.convert(input);
    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPages().length).toBe(1);
  });

  it("applies custom margin", async () => {
    await createTestImage("margin.jpg", 800, 600, { r: 150, g: 150, b: 150 });

    const input: ConverterInput = {
      jobDir: TEST_DIR,
      files: [
        {
          id: "test-margin",
          originalName: "margin.jpg",
          storedName: "margin.jpg",
          mimeType: "image/jpeg",
          size: 500,
        },
      ],
      options: { pageSize: "a4", margin: "72" },
    };

    const result = await imageToPdfConverter.convert(input);
    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPages().length).toBe(1);
  });

  it("defaults to contain fit and 36pt margin", async () => {
    await createTestImage("defaults.jpg", 800, 600, { r: 128, g: 128, b: 128 });

    const input: ConverterInput = {
      jobDir: TEST_DIR,
      files: [
        {
          id: "test-defaults",
          originalName: "defaults.jpg",
          storedName: "defaults.jpg",
          mimeType: "image/jpeg",
          size: 500,
        },
      ],
      options: { pageSize: "a4" },
    };

    const result = await imageToPdfConverter.convert(input);
    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPages().length).toBe(1);
  });
});
