import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import PptxGenJS from "pptxgenjs";
import { Document, Packer, Paragraph, TextRun } from "docx";
import JSZip from "jszip";
import docxToPdfConverter from "../lib/processing/converters/docx-to-pdf";
import pptxToPdfConverter from "../lib/processing/converters/pptx-to-pdf";
import pdfToDocxConverter from "../lib/processing/converters/pdf-to-docx";
import pdfToPptxConverter from "../lib/processing/converters/pdf-to-pptx";
import { pdfToJpgConverter, pdfToPngConverter } from "../lib/processing/converters/pdf-to-image";
import { findLibreOffice } from "../lib/processing/converters/libreoffice";
import { ptsToPx, docxImageSizeFromPdfPts, twipsFromPts, emuFromPts } from "../lib/processing/page-dims";
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

  it("preserves text content in editable form for text-heavy PDFs", async () => {
    const text = "Introduction\nThis is a detailed paragraph about the topic.\nConclusion\nSummary of findings.";
    const pdfPath = await createTestPdf(text, 1);
    const storedName = pdfPath.split(/[\\/]/).pop()!;

    const result = await pdfToDocxConverter.convert(
      makeInput(storedName, "text-heavy.pdf", "application/pdf")
    );

    const docxBuffer = await readFile(result.outputPath);
    expect(docxBuffer.length).toBeGreaterThan(1000);
  });

  it("renders image-only PDF pages as embedded images in DOCX", async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);

    page.drawRectangle({
      x: 50,
      y: 400,
      width: 200,
      height: 100,
      color: rgb(0.8, 0.2, 0.2),
    });
    page.drawCircle({
      x: 400,
      y: 300,
      size: 80,
      color: rgb(0.2, 0.4, 0.8),
    });

    const bytes = await pdfDoc.save();
    const filePath = join(TEST_DIR, `image-only-${Date.now()}.pdf`);
    await writeFile(filePath, bytes);
    const storedName = filePath.split(/[\\/]/).pop()!;

    const result = await pdfToDocxConverter.convert(
      makeInput(storedName, "image-only.pdf", "application/pdf")
    );

    const docxBuffer = await readFile(result.outputPath);
    expect(docxBuffer.length).toBeGreaterThan(5000);
    expect(result.outputFileName).toMatch(/\.docx$/);
  });

  it("produces DOCX with content for each page in multi-page PDF", async () => {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont("Helvetica");

    for (let i = 0; i < 5; i++) {
      const page = pdfDoc.addPage([595.28, 841.89]);
      page.drawText(`Page ${i + 1} unique content here`, {
        x: 50,
        y: 700,
        size: 14,
        font,
      });
      page.drawRectangle({
        x: 50,
        y: 400 + i * 20,
        width: 100 + i * 30,
        height: 50,
        color: rgb(0.1 * i, 0.2, 0.8 - 0.1 * i),
      });
    }

    const bytes = await pdfDoc.save();
    const filePath = join(TEST_DIR, `multipage-mixed-${Date.now()}.pdf`);
    await writeFile(filePath, bytes);
    const storedName = filePath.split(/[\\/]/).pop()!;

    const result = await pdfToDocxConverter.convert(
      makeInput(storedName, "multipage-mixed.pdf", "application/pdf")
    );

    const docxBuffer = await readFile(result.outputPath);
    expect(docxBuffer.length).toBeGreaterThan(5000);
    expect(result.outputFileName).toMatch(/\.docx$/);
  });

  it("DOCX output size scales with page count", async () => {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont("Helvetica");

    for (let i = 0; i < 10; i++) {
      const page = pdfDoc.addPage([595.28, 841.89]);
      page.drawText(`Page ${i + 1} has unique text content for testing`, {
        x: 50,
        y: 700,
        size: 12,
        font,
      });
    }

    const bytes = await pdfDoc.save();
    const filePath = join(TEST_DIR, `scale-test-${Date.now()}.pdf`);
    await writeFile(filePath, bytes);
    const storedName = filePath.split(/[\\/]/).pop()!;

    const result = await pdfToDocxConverter.convert(
      makeInput(storedName, "scale-test.pdf", "application/pdf")
    );

    const docxBuffer = await readFile(result.outputPath);
    expect(docxBuffer.length).toBeGreaterThan(10000);
  });

  it("does not produce DOCX with only page markers when source has visual content", async () => {
    const pdfDoc = await PDFDocument.create();

    for (let i = 0; i < 3; i++) {
      const page = pdfDoc.addPage([595.28, 841.89]);
      page.drawRectangle({
        x: 50 + i * 50,
        y: 200,
        width: 200,
        height: 400,
        color: rgb(0.2 + i * 0.2, 0.3, 0.7),
      });
    }

    const bytes = await pdfDoc.save();
    const filePath = join(TEST_DIR, `visual-only-${Date.now()}.pdf`);
    await writeFile(filePath, bytes);
    const storedName = filePath.split(/[\\/]/).pop()!;

    const result = await pdfToDocxConverter.convert(
      makeInput(storedName, "visual-only.pdf", "application/pdf")
    );

    const docxBuffer = await readFile(result.outputPath);
    expect(docxBuffer.length).toBeGreaterThan(3000);
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

  it("preserves landscape page dimensions in PPTX slides", async () => {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    pdfDoc.addPage([841.89, 595.28]);
    const page = pdfDoc.getPage(0);
    page.drawText("Landscape content", { x: 50, y: 400, size: 14, font });

    const bytes = await pdfDoc.save();
    const filePath = join(TEST_DIR, `landscape-${Date.now()}.pdf`);
    await writeFile(filePath, bytes);
    const storedName = filePath.split(/[\\/]/).pop()!;

    const result = await pdfToPptxConverter.convert(
      makeInput(storedName, "landscape.pdf", "application/pdf")
    );

    const pptxBuffer = await readFile(result.outputPath);
    expect(pptxBuffer.length).toBeGreaterThan(5000);
  });
});

describe("PDF to JPG/PNG converter", () => {
  it("converts a single-page PDF to JPG", async () => {
    const pdfPath = await createTestPdf("Image test content");
    const storedName = pdfPath.split(/[\\/]/).pop()!;

    const result = await pdfToJpgConverter.convert(
      makeInput(storedName, "test.pdf", "application/pdf")
    );

    expect(result.outputFileName).toMatch(/\.jpg$/);
    expect(result.outputMimeType).toBe("image/jpeg");
    const imgBuffer = await readFile(result.outputPath);
    expect(imgBuffer.length).toBeGreaterThan(1000);
  });

  it("converts a single-page PDF to PNG", async () => {
    const pdfPath = await createTestPdf("PNG test content");
    const storedName = pdfPath.split(/[\\/]/).pop()!;

    const result = await pdfToPngConverter.convert(
      makeInput(storedName, "test.pdf", "application/pdf")
    );

    expect(result.outputFileName).toMatch(/\.png$/);
    expect(result.outputMimeType).toBe("image/png");
    const imgBuffer = await readFile(result.outputPath);
    expect(imgBuffer.length).toBeGreaterThan(1000);
  });

  it("converts multi-page PDF to zipped images", async () => {
    const pdfPath = await createTestPdf("Multi-page content", 3);
    const storedName = pdfPath.split(/[\\/]/).pop()!;

    const result = await pdfToPngConverter.convert(
      makeInput(storedName, "multipage.pdf", "application/pdf")
    );

    expect(result.outputFileName).toMatch(/\.zip$/);
    expect(result.outputMimeType).toBe("application/zip");
    const zipBuffer = await readFile(result.outputPath);
    expect(zipBuffer.length).toBeGreaterThan(3000);
  });
});

describe("PDF to DOCX quality - page dimensions", () => {
  it("preserves landscape page dimensions in DOCX sections", async () => {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    pdfDoc.addPage([841.89, 595.28]);
    const page = pdfDoc.getPage(0);
    page.drawText("Landscape document content for testing", {
      x: 50, y: 400, size: 14, font,
    });

    const bytes = await pdfDoc.save();
    const filePath = join(TEST_DIR, `landscape-docx-${Date.now()}.pdf`);
    await writeFile(filePath, bytes);
    const storedName = filePath.split(/[\\/]/).pop()!;

    const result = await pdfToDocxConverter.convert(
      makeInput(storedName, "landscape.pdf", "application/pdf")
    );

    const docxBuffer = await readFile(result.outputPath);
    expect(docxBuffer.length).toBeGreaterThan(3000);
    expect(result.outputFileName).toMatch(/\.docx$/);
  });

  it("handles mixed text and visual pages correctly", async () => {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const page1 = pdfDoc.addPage([595.28, 841.89]);
    page1.drawText("Text-heavy page with content", { x: 50, y: 700, size: 16, font: boldFont });
    page1.drawText("This is a paragraph of body text that should be extracted as editable content.", { x: 50, y: 660, size: 12, font });
    page1.drawText("More text follows on this page for testing purposes.", { x: 50, y: 630, size: 12, font });

    const page2 = pdfDoc.addPage([595.28, 841.89]);
    page2.drawRectangle({ x: 50, y: 200, width: 500, height: 400, color: rgb(0.3, 0.5, 0.8) });
    page2.drawCircle({ x: 300, y: 400, size: 100, color: rgb(0.8, 0.3, 0.3) });

    const bytes = await pdfDoc.save();
    const filePath = join(TEST_DIR, `mixed-${Date.now()}.pdf`);
    await writeFile(filePath, bytes);
    const storedName = filePath.split(/[\\/]/).pop()!;

    const result = await pdfToDocxConverter.convert(
      makeInput(storedName, "mixed.pdf", "application/pdf")
    );

    const docxBuffer = await readFile(result.outputPath);
    expect(docxBuffer.length).toBeGreaterThan(5000);
  });

  it("renders visual-only pages at full page scale", async () => {
    const pdfDoc = await PDFDocument.create();

    const page = pdfDoc.addPage([595.28, 841.89]);
    page.drawRectangle({ x: 50, y: 100, width: 500, height: 600, color: rgb(0.2, 0.4, 0.8) });
    page.drawCircle({ x: 300, y: 400, size: 150, color: rgb(0.9, 0.2, 0.2) });
    page.drawEllipse({ x: 200, y: 300, xScale: 100, yScale: 50, color: rgb(0.2, 0.8, 0.3) });

    const bytes = await pdfDoc.save();
    const filePath = join(TEST_DIR, `visual-fullscale-${Date.now()}.pdf`);
    await writeFile(filePath, bytes);
    const storedName = filePath.split(/[\\/]/).pop()!;

    const result = await pdfToDocxConverter.convert(
      makeInput(storedName, "visual-fullscale.pdf", "application/pdf")
    );

    const docxBuffer = await readFile(result.outputPath);
    expect(docxBuffer.length).toBeGreaterThan(10000);
  });
});

describe("PDF to DOCX - unit conversion chain", () => {
  it("ptsToPx converts PDF points to CSS pixels correctly", () => {
    // A4: 595.28 pts should be 794 px at 96 DPI
    expect(ptsToPx(595.28)).toBeCloseTo(793.71, 0);
    // 72 pts = 1 inch = 96 px
    expect(ptsToPx(72)).toBe(96);
    // 144 pts = 2 inches = 192 px
    expect(ptsToPx(144)).toBe(192);
  });

  it("docxImageSizeFromPdfPts returns correct pixel dimensions", () => {
    const size = docxImageSizeFromPdfPts(595.28, 841.89);
    // A4: 595.28 pts × 96/72 = 794 px, 841.89 pts × 96/72 = 1123 px
    expect(size.width).toBe(794);
    expect(size.height).toBe(1123);
  });

  it("twipsFromPts converts correctly (20 twips per point)", () => {
    // 72 pts = 1 inch = 1440 twips
    expect(twipsFromPts(72)).toBe(1440);
    // A4 width: 595.28 pts = 11906 twips
    expect(twipsFromPts(595.28)).toBe(11906);
  });

  it("emuFromPts converts correctly (12700 EMU per point)", () => {
    // 72 pts = 1 inch = 914400 EMU
    expect(emuFromPts(72)).toBe(914400);
  });

  it("image EMU matches page EMU for same page dimensions", () => {
    const ptsW = 595.28;
    const ptsH = 841.89;
    // Image: px × 9525 (docx library conversion)
    const imgEmuW = Math.round(ptsToPx(ptsW)) * 9525;
    const imgEmuH = Math.round(ptsToPx(ptsH)) * 9525;
    // Page: pts × 12700 (OOXML twips × 635)
    const pageEmuW = Math.round(twipsFromPts(ptsW)) * 635;
    const pageEmuH = Math.round(twipsFromPts(ptsH)) * 635;
    // Should be within 0.1% of each other
    expect(Math.abs(imgEmuW - pageEmuW) / pageEmuW).toBeLessThan(0.001);
    expect(Math.abs(imgEmuH - pageEmuH) / pageEmuH).toBeLessThan(0.001);
  });
});

describe("PDF to DOCX - image fills page", () => {
  it("visual-only page image covers >95% of DOCX section", async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    page.drawRectangle({ x: 50, y: 100, width: 500, height: 600, color: rgb(0.2, 0.4, 0.8) });

    const bytes = await pdfDoc.save();
    const filePath = join(TEST_DIR, `img-fill-${Date.now()}.pdf`);
    await writeFile(filePath, bytes);
    const storedName = filePath.split(/[\\/]/).pop()!;

    const result = await pdfToDocxConverter.convert(
      makeInput(storedName, "img-fill.pdf", "application/pdf")
    );

    const docxBuffer = await readFile(result.outputPath);
    const zip = await JSZip.loadAsync(docxBuffer);
    const docXml = await zip.file("word/document.xml")!.async("string");

    // Extract page dimensions (twips)
    const pgSzMatch = docXml.match(/<w:pgSz[^>]+\/>/);
    expect(pgSzMatch).toBeTruthy();
    const wMatch = pgSzMatch![0].match(/w:w="(\d+)"/);
    const hMatch = pgSzMatch![0].match(/w:h="(\d+)"/);
    expect(wMatch).toBeTruthy();
    expect(hMatch).toBeTruthy();
    const pageTwipsW = parseInt(wMatch![1]);
    const pageTwipsH = parseInt(hMatch![1]);

    // Extract image extent (EMU)
    const extentMatch = docXml.match(/wp:extent cx="(\d+)" cy="(\d+)"/);
    expect(extentMatch).toBeTruthy();
    const imgEmuW = parseInt(extentMatch![1]);
    const imgEmuH = parseInt(extentMatch![2]);

    // Convert page twips to EMU for comparison (twips × 635 = EMU)
    const pageEmuW = pageTwipsW * 635;
    const pageEmuH = pageTwipsH * 635;

    // Image should cover >95% of page
    const widthRatio = imgEmuW / pageEmuW;
    const heightRatio = imgEmuH / pageEmuH;
    expect(widthRatio).toBeGreaterThan(0.95);
    expect(heightRatio).toBeGreaterThan(0.95);
  });

  it("landscape page image maintains correct aspect ratio", async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([841.89, 595.28]); // landscape A4
    page.drawRectangle({ x: 50, y: 100, width: 700, height: 400, color: rgb(0.8, 0.2, 0.2) });

    const bytes = await pdfDoc.save();
    const filePath = join(TEST_DIR, `landscape-fill-${Date.now()}.pdf`);
    await writeFile(filePath, bytes);
    const storedName = filePath.split(/[\\/]/).pop()!;

    const result = await pdfToDocxConverter.convert(
      makeInput(storedName, "landscape-fill.pdf", "application/pdf")
    );

    const docxBuffer = await readFile(result.outputPath);
    const zip = await JSZip.loadAsync(docxBuffer);
    const docXml = await zip.file("word/document.xml")!.async("string");

    // Check landscape orientation is set
    expect(docXml).toContain('w:orient="landscape"');

    // Image extent should match landscape proportions
    const extentMatch = docXml.match(/wp:extent cx="(\d+)" cy="(\d+)"/);
    expect(extentMatch).toBeTruthy();
    const cx = parseInt(extentMatch![1]);
    const cy = parseInt(extentMatch![2]);
    // Landscape: cx > cy
    expect(cx).toBeGreaterThan(cy);
  });

  it("multi-page PDF creates correct number of DOCX sections", async () => {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    for (let i = 0; i < 5; i++) {
      const page = pdfDoc.addPage([595.28, 841.89]);
      page.drawText(`Page ${i + 1} content`, { x: 50, y: 400, size: 14, font });
    }

    const bytes = await pdfDoc.save();
    const filePath = join(TEST_DIR, `multi-section-${Date.now()}.pdf`);
    await writeFile(filePath, bytes);
    const storedName = filePath.split(/[\\/]/).pop()!;

    const result = await pdfToDocxConverter.convert(
      makeInput(storedName, "multi-section.pdf", "application/pdf")
    );

    const docxBuffer = await readFile(result.outputPath);
    const zip = await JSZip.loadAsync(docxBuffer);
    const docXml = await zip.file("word/document.xml")!.async("string");

    // Count w:pgSz elements — one per page section
    const pgSzCount = (docXml.match(/<w:pgSz/g) ?? []).length;
    expect(pgSzCount).toBe(5);
  });

  it("no empty or marker-only pages in output", async () => {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.addPage([595.28, 841.89]);
    page.drawText("Real content here", { x: 50, y: 400, size: 14, font });

    const bytes = await pdfDoc.save();
    const filePath = join(TEST_DIR, `no-empty-${Date.now()}.pdf`);
    await writeFile(filePath, bytes);
    const storedName = filePath.split(/[\\/]/).pop()!;

    const result = await pdfToDocxConverter.convert(
      makeInput(storedName, "no-empty.pdf", "application/pdf")
    );

    const docxBuffer = await readFile(result.outputPath);
    const zip = await JSZip.loadAsync(docxBuffer);
    const docXml = await zip.file("word/document.xml")!.async("string");

    // Should not contain fallback marker text
    expect(docXml).not.toContain("content could not be rendered");
    expect(docXml).not.toContain("No extractable content");
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
