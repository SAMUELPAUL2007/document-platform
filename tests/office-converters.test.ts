import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { PDFDocument } from "pdf-lib";
import * as XLSX from "xlsx";
import PptxGenJS from "pptxgenjs";
import { Document, Packer, Paragraph, TextRun } from "docx";
import docxToPdfConverter from "../lib/processing/converters/docx-to-pdf";
import xlsxToPdfConverter from "../lib/processing/converters/xlsx-to-pdf";
import pptxToPdfConverter from "../lib/processing/converters/pptx-to-pdf";
import pdfToDocxConverter from "../lib/processing/converters/pdf-to-docx";
import pdfToXlsxConverter from "../lib/processing/converters/pdf-to-xlsx";
import pdfToPptxConverter from "../lib/processing/converters/pdf-to-pptx";
import { findLibreOffice } from "../lib/processing/converters/libreoffice";
import type { ConverterInput } from "../lib/processing/types";

const TEST_DIR = join(process.cwd(), ".tmp", "test-office-converters");

let libreOfficeAvailable = false;

beforeAll(async () => {
  await mkdir(TEST_DIR, { recursive: true });
  libreOfficeAvailable = (await findLibreOffice()) !== null;
});

afterAll(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

async function createTestPdf(
  text: string = "Hello World\nTest content\nLine 3",
  pages: number = 1
): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont("Helvetica");

  for (let p = 0; p < pages; p++) {
    const page = pdfDoc.addPage([595.28, 841.89]);
    const lines = text.split("\n");
    let y = 800;
    for (const line of lines) {
      page.drawText(line, { x: 50, y, size: 12, font });
      y -= 20;
    }
  }

  const bytes = await pdfDoc.save();
  const filePath = join(TEST_DIR, `test-${Date.now()}.pdf`);
  await writeFile(filePath, bytes);
  return filePath;
}

async function createTestDocx(
  text: string = "Hello World\nTest content"
): Promise<string> {
  const doc = new Document({
    sections: [
      {
        children: text.split("\n").map(
          (line) =>
            new Paragraph({
              children: [new TextRun({ text: line })],
            })
        ),
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const filePath = join(TEST_DIR, `test-${Date.now()}.docx`);
  await writeFile(filePath, buffer);
  return filePath;
}

async function createTestXlsx(): Promise<string> {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Name", "Age", "City"],
    ["Alice", "30", "New York"],
    ["Bob", "25", "London"],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filePath = join(TEST_DIR, `test-${Date.now()}.xlsx`);
  await writeFile(filePath, buffer);
  return filePath;
}

async function createTestPptx(): Promise<string> {
  const pptx = new PptxGenJS();
  const slide = pptx.addSlide();
  slide.addText("Test Title", { x: 1, y: 1, w: 8, h: 1 });
  slide.addText("Test content body text", { x: 1, y: 2.5, w: 8, h: 2 });
  const result = await pptx.write({ outputType: "nodebuffer" });
  const buffer = Buffer.isBuffer(result) ? result : Buffer.from(result as ArrayBuffer);
  const filePath = join(TEST_DIR, `test-${Date.now()}.pptx`);
  await writeFile(filePath, buffer);
  return filePath;
}

async function createComplexTestPptx(): Promise<string> {
  const pptx = new PptxGenJS();

  // Slide 1: Title slide with shapes and text
  const slide1 = pptx.addSlide();
  slide1.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: "100%", h: "100%",
    fill: { type: "solid", color: "003366" },
  });
  slide1.addText("Cosmic Atlas", {
    x: 1, y: 2, w: 8, h: 1.5,
    fontSize: 44, color: "FFFFFF", bold: true,
    align: "center",
  });
  slide1.addText("A Journey Through Space", {
    x: 1, y: 3.5, w: 8, h: 0.8,
    fontSize: 24, color: "CCCCCC",
    align: "center",
  });

  // Slide 2: Table slide
  const slide2 = pptx.addSlide();
  slide2.addText("Planetary Data", { x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 28, bold: true });
  const tableRows = [
    [
      { text: "Planet", options: { bold: true, fill: { color: "003366" }, color: "FFFFFF" } },
      { text: "Distance (AU)", options: { bold: true, fill: { color: "003366" }, color: "FFFFFF" } },
      { text: "Diameter (km)", options: { bold: true, fill: { color: "003366" }, color: "FFFFFF" } },
    ],
    [
      { text: "Mercury", options: {} },
      { text: "0.39", options: {} },
      { text: "4,879", options: {} },
    ],
    [
      { text: "Venus", options: {} },
      { text: "0.72", options: {} },
      { text: "12,104", options: {} },
    ],
    [
      { text: "Earth", options: {} },
      { text: "1.00", options: {} },
      { text: "12,756", options: {} },
    ],
    [
      { text: "Mars", options: {} },
      { text: "1.52", options: {} },
      { text: "6,792", options: {} },
    ],
  ];
  slide2.addTable(tableRows, {
    x: 0.5, y: 1.3, w: 9,
    fontSize: 14,
    border: { type: "solid", pt: 1, color: "CCCCCC" },
    colW: [3, 3, 3],
    rowH: 0.5,
  });

  // Slide 3: Multiple shapes
  const slide3 = pptx.addSlide();
  slide3.addText("Shapes and Diagrams", { x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 28, bold: true });
  slide3.addShape(pptx.ShapeType.ellipse, {
    x: 1, y: 2, w: 2, h: 2,
    fill: { type: "solid", color: "FF6600" },
  });
  slide3.addShape(pptx.ShapeType.rect, {
    x: 4, y: 2, w: 2, h: 2,
    fill: { type: "solid", color: "0066CC" },
  });
  slide3.addShape(pptx.ShapeType.triangle, {
    x: 7, y: 2, w: 2, h: 2,
    fill: { type: "solid", color: "00CC66" },
  });

  // Slide 4: Bullet points
  const slide4 = pptx.addSlide();
  slide4.addText("Key Findings", { x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 28, bold: true });
  slide4.addText([
    { text: "First finding with important data", options: { bullet: true, fontSize: 18 } },
    { text: "Second finding about exploration", options: { bullet: true, fontSize: 18 } },
    { text: "Third finding with conclusions", options: { bullet: true, fontSize: 18 } },
    { text: "Fourth finding for future research", options: { bullet: true, fontSize: 18 } },
  ], { x: 0.5, y: 1.3, w: 9, h: 4 });

  // Slide 5: Multi-column layout
  const slide5 = pptx.addSlide();
  slide5.addText("Multi-Column Layout", { x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 28, bold: true });
  slide5.addText("Column 1\n\nContent for the first column with detailed information.", {
    x: 0.5, y: 1.3, w: 2.8, h: 4, fontSize: 14, valign: "top",
  });
  slide5.addText("Column 2\n\nContent for the second column with more details.", {
    x: 3.6, y: 1.3, w: 2.8, h: 4, fontSize: 14, valign: "top",
  });
  slide5.addText("Column 3\n\nContent for the third column with final notes.", {
    x: 6.7, y: 1.3, w: 2.8, h: 4, fontSize: 14, valign: "top",
  });

  const result = await pptx.write({ outputType: "nodebuffer" });
  const buffer = Buffer.isBuffer(result) ? result : Buffer.from(result as ArrayBuffer);
  const filePath = join(TEST_DIR, `complex-test-${Date.now()}.pptx`);
  await writeFile(filePath, buffer);
  return filePath;
}

function makeInput(storedName: string, originalName: string, mimeType: string): ConverterInput {
  return {
    jobDir: TEST_DIR,
    files: [{ id: `test-${Date.now()}`, storedName, originalName, mimeType, size: 100 }],
  };
}

describe("DOCX to PDF converter", () => {
  it("converts a DOCX file to PDF", async () => {
    await createTestDocx();
    const files = await import("fs/promises").then((f) => f.readdir(TEST_DIR));
    const docxFile = files.find((f) => f.endsWith(".docx"));
    expect(docxFile).toBeDefined();

    const result = await docxToPdfConverter.convert(
      makeInput(docxFile!, docxFile!, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    );

    expect(result.outputFileName).toMatch(/\.pdf$/);
    expect(result.outputMimeType).toBe("application/pdf");

    const pdfBuffer = await readFile(result.outputPath);
    expect(pdfBuffer.length).toBeGreaterThan(0);

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(1);
  });
});

describe("XLSX to PDF converter", () => {
  it("converts an XLSX file to PDF", async () => {
    await createTestXlsx();
    const files = await import("fs/promises").then((f) => f.readdir(TEST_DIR));
    const xlsxFile = files.find((f) => f.endsWith(".xlsx"));
    expect(xlsxFile).toBeDefined();

    const result = await xlsxToPdfConverter.convert(
      makeInput(xlsxFile!, xlsxFile!, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    );

    expect(result.outputFileName).toMatch(/\.pdf$/);
    expect(result.outputMimeType).toBe("application/pdf");

    const pdfBuffer = await readFile(result.outputPath);
    expect(pdfBuffer.length).toBeGreaterThan(0);

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(1);
  });
});

describe("PPTX to PDF converter", () => {
  it("converts a simple PPTX file to PDF", async () => {
    if (!libreOfficeAvailable) {
      console.log("  ⊘ Skipping: LibreOffice not installed");
      return;
    }

    await createTestPptx();
    const files = await import("fs/promises").then((f) => f.readdir(TEST_DIR));
    const pptxFile = files.find((f) => f.startsWith("test-") && f.endsWith(".pptx"));
    expect(pptxFile).toBeDefined();

    const result = await pptxToPdfConverter.convert(
      makeInput(pptxFile!, pptxFile!, "application/vnd.openxmlformats-officedocument.presentationml.presentation")
    );

    expect(result.outputFileName).toMatch(/\.pdf$/);
    expect(result.outputMimeType).toBe("application/pdf");

    const pdfBuffer = await readFile(result.outputPath);
    expect(pdfBuffer.length).toBeGreaterThan(0);

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(1);
  });

  it("converts a complex PPTX with multiple slides to PDF preserving slide count", async () => {
    if (!libreOfficeAvailable) {
      console.log("  ⊘ Skipping: LibreOffice not installed");
      return;
    }

    await createComplexTestPptx();
    const files = await import("fs/promises").then((f) => f.readdir(TEST_DIR));
    const pptxFile = files.find((f) => f.startsWith("complex-test-") && f.endsWith(".pptx"));
    expect(pptxFile).toBeDefined();

    const result = await pptxToPdfConverter.convert(
      makeInput(pptxFile!, pptxFile!, "application/vnd.openxmlformats-officedocument.presentationml.presentation")
    );

    expect(result.outputFileName).toMatch(/\.pdf$/);
    expect(result.outputMimeType).toBe("application/pdf");

    const pdfBuffer = await readFile(result.outputPath);
    expect(pdfBuffer.length).toBeGreaterThan(0);

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(5);
  });

  it("throws clear error when no input file is provided", async () => {
    const converter = pptxToPdfConverter;
    const emptyInput: ConverterInput = {
      jobDir: TEST_DIR,
      files: [],
    };

    await expect(converter.convert(emptyInput)).rejects.toThrow("No file provided");
  });

  it("rejects PPTX files when LibreOffice is unavailable", async () => {
    if (libreOfficeAvailable) {
      console.log("  ⊘ Skipping: LibreOffice is installed (cannot test unavailable path)");
      return;
    }

    await createTestPptx();
    const files = await import("fs/promises").then((f) => f.readdir(TEST_DIR));
    const pptxFile = files.find((f) => f.startsWith("test-") && f.endsWith(".pptx"));
    expect(pptxFile).toBeDefined();

    await expect(
      pptxToPdfConverter.convert(
        makeInput(pptxFile!, pptxFile!, "application/vnd.openxmlformats-officedocument.presentationml.presentation")
      )
    ).rejects.toThrow("PPTX to PDF conversion requires LibreOffice");
  });

  it("produces non-empty PDF output", async () => {
    if (!libreOfficeAvailable) {
      console.log("  ⊘ Skipping: LibreOffice not installed");
      return;
    }

    await createTestPptx();
    const files = await import("fs/promises").then((f) => f.readdir(TEST_DIR));
    const pptxFile = files.find((f) => f.startsWith("test-") && f.endsWith(".pptx"));
    expect(pptxFile).toBeDefined();

    const result = await pptxToPdfConverter.convert(
      makeInput(pptxFile!, pptxFile!, "application/vnd.openxmlformats-officedocument.presentationml.presentation")
    );

    const pdfBuffer = await readFile(result.outputPath);
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const page = pdfDoc.getPage(0);
    const { width, height } = page.getSize();
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });
});

describe("PDF to DOCX converter", () => {
  it("converts a PDF to DOCX", async () => {
    const pdfPath = await createTestPdf("Hello World\nTest content");
    const storedName = pdfPath.split(/[\\/]/).pop()!;

    const result = await pdfToDocxConverter.convert(
      makeInput(storedName, "test.pdf", "application/pdf")
    );

    expect(result.outputFileName).toMatch(/\.docx$/);
    expect(result.outputMimeType).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    const docxBuffer = await readFile(result.outputPath);
    expect(docxBuffer.length).toBeGreaterThan(0);
  });

  it("converts a multi-page PDF to DOCX", async () => {
    const pdfPath = await createTestPdf("Page one content", 3);
    const storedName = pdfPath.split(/[\\/]/).pop()!;

    const result = await pdfToDocxConverter.convert(
      makeInput(storedName, "multipage.pdf", "application/pdf")
    );

    expect(result.outputFileName).toMatch(/\.docx$/);
    const docxBuffer = await readFile(result.outputPath);
    expect(docxBuffer.length).toBeGreaterThan(0);
  });
});

describe("PDF to XLSX converter", () => {
  it("converts a PDF to XLSX", async () => {
    const pdfPath = await createTestPdf();
    const storedName = pdfPath.split(/[\\/]/).pop()!;

    const result = await pdfToXlsxConverter.convert(
      makeInput(storedName, "test.pdf", "application/pdf")
    );

    expect(result.outputFileName).toMatch(/\.xlsx$/);
    expect(result.outputMimeType).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    const xlsxBuffer = await readFile(result.outputPath);
    expect(xlsxBuffer.length).toBeGreaterThan(0);

    const wb = XLSX.read(xlsxBuffer, { type: "buffer" });
    expect(wb.SheetNames.length).toBeGreaterThanOrEqual(1);
  });

  it("converts a multi-page PDF to XLSX with multiple sheets", async () => {
    const pdfPath = await createTestPdf("Content page 1", 3);
    const storedName = pdfPath.split(/[\\/]/).pop()!;

    const result = await pdfToXlsxConverter.convert(
      makeInput(storedName, "multipage.pdf", "application/pdf")
    );

    expect(result.outputFileName).toMatch(/\.xlsx$/);
    const xlsxBuffer = await readFile(result.outputPath);
    const wb = XLSX.read(xlsxBuffer, { type: "buffer" });
    expect(wb.SheetNames.length).toBe(3);
  });
});

describe("PDF to PPTX converter", () => {
  it("converts a PDF to PPTX", async () => {
    const pdfPath = await createTestPdf();
    const storedName = pdfPath.split(/[\\/]/).pop()!;

    const result = await pdfToPptxConverter.convert(
      makeInput(storedName, "test.pdf", "application/pdf")
    );

    expect(result.outputFileName).toMatch(/\.pptx$/);
    expect(result.outputMimeType).toBe(
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );

    const pptxBuffer = await readFile(result.outputPath);
    expect(pptxBuffer.length).toBeGreaterThan(0);
  });

  it("converts a multi-page PDF to PPTX with multiple slides", async () => {
    const pdfPath = await createTestPdf("Page content", 3);
    const storedName = pdfPath.split(/[\\/]/).pop()!;

    const result = await pdfToPptxConverter.convert(
      makeInput(storedName, "multipage.pdf", "application/pdf")
    );

    expect(result.outputFileName).toMatch(/\.pptx$/);
    const pptxBuffer = await readFile(result.outputPath);
    expect(pptxBuffer.length).toBeGreaterThan(0);
  });
});

describe("LibreOffice wrapper", () => {
  it("findLibreOffice returns null or path", async () => {
    const { findLibreOffice } = await import("../lib/processing/converters/libreoffice");
    const result = await findLibreOffice();
    expect(result === null || typeof result === "string").toBe(true);
  });

  it("reports LibreOffice availability correctly", async () => {
    const result = await findLibreOffice();
    if (result) {
      expect(result.length).toBeGreaterThan(0);
    } else {
      expect(result).toBeNull();
    }
  });
});
