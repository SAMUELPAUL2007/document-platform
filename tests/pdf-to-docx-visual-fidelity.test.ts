import { describe, it, expect } from "vitest";
import { readFile, writeFile, mkdir, stat } from "fs/promises";
import { join } from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import JSZip from "jszip";
import pdfToDocxConverter from "../lib/processing/converters/pdf-to-docx";
import type { ConverterInput } from "../lib/processing/types";

const TEST_DIR = join(process.cwd(), "tests", ".tmp");

// ─── Test PDF: bordered page with heading, paragraphs, margins ──

async function createBorderedPagePdf(): Promise<string> {
  await mkdir(TEST_DIR, { recursive: true });
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Page 1: Portrait with border, heading, paragraphs, margins
  const page1 = pdfDoc.addPage([612, 792]); // US Letter

  // Draw border (50pt from edges)
  page1.drawRectangle({
    x: 50, y: 50,
    width: 512, height: 692,
    borderColor: rgb(0, 0, 0),
    borderWidth: 2,
  });

  // Heading (centered, bold)
  page1.drawText("Document Title", {
    x: 180, y: 700, size: 24, font: boldFont, color: rgb(0, 0, 0),
  });

  // Horizontal rule under heading
  page1.drawRectangle({
    x: 50, y: 685, width: 512, height: 1, color: rgb(0.5, 0.5, 0.5),
  });

  // Body paragraphs
  const lines = [
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    "Ut enim ad minim veniam, quis nostrud exercitation ullamco.",
    "Duis aute irure dolor in reprehenderit in voluptate velit esse.",
    "Cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat.",
    "Cupidatat non proident, sunt in culpa qui officia deserunt.",
    "Mollit anim id est laborum. Sed ut perspiciatis unde omnis.",
    "Iste natus error sit voluptatem accusantium doloremque laudantium.",
  ];

  let y = 650;
  for (const line of lines) {
    page1.drawText(line, { x: 70, y, size: 12, font });
    y -= 20;
  }

  // Bold text
  page1.drawText("Important: This is bold text that must be preserved.", {
    x: 70, y: y - 20, size: 12, font: boldFont, color: rgb(0.8, 0, 0),
  });

  // Page 2: Landscape with border
  const page2 = pdfDoc.addPage([792, 612]); // Landscape Letter

  page2.drawRectangle({
    x: 50, y: 50,
    width: 692, height: 512,
    borderColor: rgb(0, 0, 1),
    borderWidth: 2,
  });

  page2.drawText("Landscape Page with Border", {
    x: 200, y: 500, size: 20, font: boldFont, color: rgb(0, 0, 0.5),
  });

  page2.drawText("This page verifies landscape orientation is preserved.", {
    x: 70, y: 450, size: 14, font,
  });

  // Page 3: Custom size (square-ish)
  const page3 = pdfDoc.addPage([500, 500]);

  page3.drawRectangle({
    x: 20, y: 20,
    width: 460, height: 460,
    borderColor: rgb(0, 0.5, 0),
    borderWidth: 2,
  });

  page3.drawText("Custom Square Page", {
    x: 130, y: 400, size: 18, font: boldFont, color: rgb(0, 0.3, 0),
  });

  const bytes = await pdfDoc.save();
  const filePath = join(TEST_DIR, "bordered-page-fidelity.pdf");
  await writeFile(filePath, bytes);
  return filePath;
}

function makeInput(storedName: string, originalName: string, size: number): ConverterInput {
  return {
    jobDir: TEST_DIR,
    files: [{
      id: "test",
      originalName,
      storedName,
      mimeType: "application/pdf",
      size,
    }],
    onProgress: () => {},
  };
}

function parsePgSz(xml: string) {
  const match = xml.match(/<w:pgSz[^/]*\/>/);
  if (!match) return null;
  const w = match[0].match(/w:w="(\d+)"/);
  const h = match[0].match(/w:h="(\d+)"/);
  const orient = match[0].match(/w:orient="(\w+)"/);
  if (!w || !h) return null;
  return {
    wTwips: parseInt(w[1]),
    hTwips: parseInt(h[1]),
    orient: orient ? orient[1] : "portrait",
  };
}

// ─── Visual Fidelity Regression Tests ─────────────────────────

describe("PDF→DOCX visual fidelity regression", () => {
  let docxBuffer: Buffer;
  let zip: JSZip;
  let docXml: string;

  it("converts bordered-page PDF to DOCX", async () => {
    const pdfPath = await createBorderedPagePdf();
    const storedName = pdfPath.split(/[\\/]/).pop()!;
    const fileStat = await stat(pdfPath);

    const result = await pdfToDocxConverter.convert(
      makeInput(storedName, "bordered-page-fidelity.pdf", fileStat.size)
    );

    expect(result.outputFileName).toBe("bordered-page-fidelity.docx");
    expect(result.outputMimeType).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    docxBuffer = await readFile(result.outputPath);
    zip = await JSZip.loadAsync(docxBuffer);
    docXml = await zip.file("word/document.xml")!.async("string");
  });

  it("produces exactly one page image per source PDF page (3 pages → 3 images)", () => {
    const mediaFiles = Object.keys(zip.files).filter(
      (f) => f.startsWith("word/media/") && f.endsWith(".png")
    );
    expect(mediaFiles.length).toBe(3);
  });

  it("preserves page count (3 source pages → 3 DOCX sections)", () => {
    const sectionMatches = docXml.match(/<w:sectPr/g) || [];
    expect(sectionMatches.length).toBe(3);
  });

  it("preserves page orientation (portrait/landscape/mixed)", () => {
    // The DOCX XML may have multiple w:pgSz. Parse all.
    const pgSzMatches = docXml.match(/<w:pgSz[^/]*\/>/g) || [];
    expect(pgSzMatches.length).toBe(3);

    // Page 1: portrait (w:w < w:h)
    const pg1 = parsePgSz(docXml.substring(docXml.indexOf(pgSzMatches[0]!)));
    expect(pg1!.orient).toBe("portrait");

    // Page 2: landscape (w:w > w:h)
    const pg2 = parsePgSz(docXml.substring(docXml.indexOf(pgSzMatches[1]!)));
    expect(pg2!.orient).toBe("landscape");

    // Page 3: portrait (500x500 → square, no orientation key = portrait by default)
    const pg3 = parsePgSz(docXml.substring(docXml.indexOf(pgSzMatches[2]!)));
    expect(pg3).not.toBeNull();
  });

  it("preserves page dimensions for each source page", () => {
    const TWIPS_PER_INCH = 1440;
    const PTS_PER_INCH = 72;

    const pgSzMatches = docXml.match(/<w:pgSz[^/]*\/>/g) || [];
    expect(pgSzMatches.length).toBe(3);

    // Page 1: 612x792 pts = 8.5x11 inches
    const pg1 = parsePgSz(docXml.substring(docXml.indexOf(pgSzMatches[0]!)));
    expect(pg1!.wTwips / TWIPS_PER_INCH).toBeCloseTo(8.5, 1);
    expect(pg1!.hTwips / TWIPS_PER_INCH).toBeCloseTo(11, 1);

    // Page 2: 792x612 pts landscape → OOXML w:w=11", w:h=8.5"
    const pg2 = parsePgSz(docXml.substring(docXml.indexOf(pgSzMatches[1]!)));
    expect(pg2!.wTwips / TWIPS_PER_INCH).toBeCloseTo(11, 1);
    expect(pg2!.hTwips / TWIPS_PER_INCH).toBeCloseTo(8.5, 1);

    // Page 3: 500x500 pts = 6.94x6.94 inches
    const pg3 = parsePgSz(docXml.substring(docXml.indexOf(pgSzMatches[2]!)));
    expect(pg3!.wTwips / TWIPS_PER_INCH).toBeCloseTo(6.94, 1);
    expect(pg3!.hTwips / TWIPS_PER_INCH).toBeCloseTo(6.94, 1);
  });

  it("each page image has correct aspect ratio (width:height matches source)", async () => {
    // Find wp:extent for each image in the XML
    const extentMatches = docXml.match(/<wp:extent[^/]*\/>/g) || [];
    expect(extentMatches.length).toBe(3);

    // Page 1: 612/792 = 0.7727
    const pg1Extent = extentMatches[0]!;
    const pg1Cx = parseInt(pg1Extent.match(/cx="(\d+)"/)![1]);
    const pg1Cy = parseInt(pg1Extent.match(/cy="(\d+)"/)![1]);
    const pg1Ratio = pg1Cx / pg1Cy;
    expect(pg1Ratio).toBeCloseTo(612 / 792, 2);

    // Page 2: 792/612 = 1.2941 (landscape)
    const pg2Extent = extentMatches[1]!;
    const pg2Cx = parseInt(pg2Extent.match(/cx="(\d+)"/)![1]);
    const pg2Cy = parseInt(pg2Extent.match(/cy="(\d+)"/)![1]);
    const pg2Ratio = pg2Cx / pg2Cy;
    expect(pg2Ratio).toBeCloseTo(792 / 612, 2);

    // Page 3: 500/500 = 1.0
    const pg3Extent = extentMatches[2]!;
    const pg3Cx = parseInt(pg3Extent.match(/cx="(\d+)"/)![1]);
    const pg3Cy = parseInt(pg3Extent.match(/cy="(\d+)"/)![1]);
    const pg3Ratio = pg3Cx / pg3Cy;
    expect(pg3Ratio).toBeCloseTo(1.0, 2);
  });

  it("every page image is a valid PNG with real content (>1KB)", async () => {
    const mediaFiles = Object.keys(zip.files).filter(
      (f) => f.startsWith("word/media/") && f.endsWith(".png")
    );

    for (const mediaFile of mediaFiles) {
      const data = await zip.file(mediaFile)!.async("nodebuffer");
      // PNG magic bytes: 0x89 0x50 0x4E 0x47
      expect(data[0]).toBe(0x89);
      expect(data[1]).toBe(0x50);
      expect(data[2]).toBe(0x4e);
      expect(data[3]).toBe(0x47);
      expect(data.length).toBeGreaterThan(1000);
    }
  });

  it("DOCX has zero margins (image fills entire page)", () => {
    // Check that w:pgMar is 0 for all sections or absent
    const pgMarMatches = docXml.match(/<w:pgMar[^/]*\/>/g) || [];
    for (const pgMar of pgMarMatches) {
      expect(pgMar).toContain('w:top="0"');
      expect(pgMar).toContain('w:left="0"');
      expect(pgMar).toContain('w:bottom="0"');
      expect(pgMar).toContain('w:right="0"');
    }
  });

  it("no text-mode reconstruction: no <w:t> tags with extracted text content", () => {
    // The image-mode DOCX should NOT contain text extracted from PDF.
    // It should only contain empty or whitespace paragraphs.
    const textTagMatches = docXml.match(/<w:t[^>]*>[^<]+<\/w:t>/g) || [];
    // All <w:t> content should be empty strings or whitespace only
    for (const tag of textTagMatches) {
      const content = tag.replace(/<[^>]+>/g, "").trim();
      expect(content).toBe("");
    }
  });
});
