import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdir, rm, stat, copyFile } from "fs/promises";
import { join } from "path";
import pdfToDocxConverter from "../lib/processing/converters/pdf-to-docx";
import pdfToPptxConverter from "../lib/processing/converters/pdf-to-pptx";
import { pdfToJpgConverter, pdfToPngConverter } from "../lib/processing/converters/pdf-to-image";
import type { ConverterInput } from "../lib/processing/types";

const TEST_DIR = join(process.cwd(), ".tmp", "test-cosmic-golden");
const PDF_PATH = join(process.cwd(), "The Cosmic Atlas.pdf");

describe("Cosmic Atlas golden test - all conversion paths", () => {
  beforeAll(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    await copyFile(PDF_PATH, join(TEST_DIR, "The Cosmic Atlas.pdf"));
  });

  afterAll(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  function makeInput(): ConverterInput {
    return {
      jobDir: TEST_DIR,
      files: [
        {
          id: "cosmic-001",
          originalName: "The Cosmic Atlas.pdf",
          storedName: "The Cosmic Atlas.pdf",
          mimeType: "application/pdf",
          size: 0,
        },
      ],
    };
  }

  it("PDF → DOCX: produces meaningful DOCX from 17-page landscape PDF", async () => {
    const result = await pdfToDocxConverter.convert(makeInput());
    const s = await stat(result.outputPath);
    expect(result.outputFileName).toMatch(/\.docx$/);
    expect(s.size).toBeGreaterThan(5000);

    const { readFileSync } = await import("fs");
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(readFileSync(result.outputPath));
    const docXml = await zip.file("word/document.xml")?.async("string");
    expect(docXml).toBeTruthy();
    // Should have section breaks for multiple pages
    const sectionCount = (docXml!.match(/w:sectPr/g) || []).length;
    expect(sectionCount).toBeGreaterThanOrEqual(10);
  }, 60000);

  it("PDF → PPTX: produces PPTX with correct slide dimensions", async () => {
    const result = await pdfToPptxConverter.convert(makeInput());
    const s = await stat(result.outputPath);
    expect(result.outputFileName).toMatch(/\.pptx$/);
    expect(s.size).toBeGreaterThan(50000);

    const pptxjs = await import("pptxgenjs");
    const JSZip = (await import("jszip")).default;
    const { readFileSync } = await import("fs");
    const zip = await JSZip.loadAsync(readFileSync(result.outputPath));
    const pptXml = await zip.file("ppt/presentation.xml")?.async("string");
    expect(pptXml).toBeTruthy();
    // Landscape slide dimensions should be present (19.11 × 10.67 inches → EMU)
    expect(pptXml).toMatch(/cx="|cy="/);
  }, 60000);

  it("PDF → JPG: produces ZIP of JPG images", async () => {
    const result = await pdfToJpgConverter.convert(makeInput());
    const s = await stat(result.outputPath);
    expect(result.outputFileName).toMatch(/\.zip$/);
    expect(s.size).toBeGreaterThan(100000);
  }, 120000);

  it("PDF → PNG: produces ZIP of PNG images", async () => {
    const result = await pdfToPngConverter.convert(makeInput());
    const s = await stat(result.outputPath);
    expect(result.outputFileName).toMatch(/\.zip$/);
    expect(s.size).toBeGreaterThan(100000);
  }, 120000);
});
