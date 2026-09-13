import { describe, it, expect } from "vitest";
import { readFile, writeFile, mkdir, stat } from "fs/promises";
import { join } from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import JSZip from "jszip";
import pdfToDocxConverter from "../lib/processing/converters/pdf-to-docx";
import type { ConverterInput } from "../lib/processing/types";

const TEST_DIR = join(process.cwd(), "tests", ".tmp");

async function createComplexPdf(): Promise<string> {
  await mkdir(TEST_DIR, { recursive: true });
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 0; i < 17; i++) {
    const page = pdfDoc.addPage([612, 792]);

    page.drawText("The Cosmic Atlas", {
      x: 180, y: 720, size: 24, font: boldFont, color: rgb(0.1, 0.1, 0.4),
    });
    page.drawText(`Page ${i + 1} of 17`, {
      x: 260, y: 690, size: 12, font, color: rgb(0.4, 0.4, 0.4),
    });

    page.drawRectangle({ x: 50, y: 600, width: 500, height: 2, color: rgb(0.2, 0.4, 0.8) });

    const colors = [
      rgb(0.8, 0.2, 0.2), rgb(0.2, 0.6, 0.8), rgb(0.3, 0.7, 0.3),
      rgb(0.9, 0.6, 0.1), rgb(0.6, 0.2, 0.8), rgb(0.1, 0.5, 0.5),
      rgb(0.8, 0.4, 0.6), rgb(0.4, 0.4, 0.9), rgb(0.7, 0.7, 0.2),
      rgb(0.5, 0.2, 0.2), rgb(0.2, 0.8, 0.4), rgb(0.8, 0.5, 0.1),
      rgb(0.3, 0.3, 0.7), rgb(0.6, 0.8, 0.3), rgb(0.9, 0.3, 0.5),
      rgb(0.2, 0.7, 0.7), rgb(0.5, 0.5, 0.5),
    ];

    page.drawCircle({ x: 150, y: 500, size: 80, color: colors[i] });
    page.drawRectangle({ x: 300, y: 400, width: 200, height: 150, color: colors[(i + 3) % 17] });
    page.drawEllipse({ x: 150, y: 300, xScale: 100, yScale: 60, color: colors[(i + 7) % 17] });

    page.drawText("Introduction to celestial navigation and star mapping", {
      x: 50, y: 250, size: 14, font,
    });
    page.drawText(`Chapter ${i + 1}: Exploring the Cosmos`, {
      x: 50, y: 220, size: 12, font,
    });
    page.drawText("This section covers important aspects of astronomical observation", {
      x: 50, y: 190, size: 11, font,
    });
    page.drawText("and provides detailed charts for amateur astronomers.", {
      x: 50, y: 170, size: 11, font,
    });

    page.drawText(`The Cosmic Atlas - Page ${i + 1}`, {
      x: 220, y: 50, size: 10, font, color: rgb(0.5, 0.5, 0.5),
    });
  }

  const bytes = await pdfDoc.save();
  const filePath = join(TEST_DIR, "cosmic-atlas-complex.pdf");
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

describe("PDF to DOCX - Cosmic Atlas complex regression", () => {
  it("converts a 17-page complex visual PDF to a meaningful DOCX", async () => {
    const pdfPath = await createComplexPdf();
    const storedName = pdfPath.split(/[\\/]/).pop()!;
    const fileStat = await stat(pdfPath);

    const result = await pdfToDocxConverter.convert(
      makeInput(storedName, "The Cosmic Atlas.pdf", fileStat.size)
    );

    expect(result.outputFileName).toBe("The Cosmic Atlas.docx");
    expect(result.outputMimeType).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    const docxBuffer = await readFile(result.outputPath);

    expect(docxBuffer.length).toBeGreaterThan(5000);

    const zip = await JSZip.loadAsync(docxBuffer);
    const files = Object.keys(zip.files);

    expect(files).toContain("word/document.xml");
    expect(files.length).toBeGreaterThan(10);

    const docXml = await zip.file("word/document.xml")!.async("string");
    expect(docXml.length).toBeGreaterThan(500);
    expect(docXml).toContain("The Cosmic Atlas");
    expect(docXml).toContain("celestial navigation");

    const chapterMatches = docXml.match(/Chapter \d+/g) || [];
    expect(chapterMatches.length).toBe(17);

    // Verify page dimensions are embedded in the DOCX
    // A4 = 595.28pt = 7562556 EMU width, 841.89pt = 10693749 EMU height
    expect(docXml).toContain("w:pgSz");
  });
});

// ─── Landscape geometry regression (P0 fix) ──────────────────
// The docx library swaps width/height in OOXML when orientation=LANDSCAPE:
//   w:w = heightTwips, w:h = widthTwips
// We must pre-swap dimensions so the final OOXML has correct physical page size.

const TWIPS_PER_INCH = 1440;
const PTS_PER_INCH = 72;

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
    wInches: parseInt(w[1]) / TWIPS_PER_INCH,
    hInches: parseInt(h[1]) / TWIPS_PER_INCH,
  };
}

async function createLandscapePdf(
  widthPt: number,
  heightPt: number
): Promise<string> {
  await mkdir(TEST_DIR, { recursive: true });
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage([widthPt, heightPt]);
  page.drawText("Landscape Page", {
    x: widthPt / 2 - 60,
    y: heightPt / 2,
    size: 24,
    font,
    color: rgb(0.1, 0.3, 0.7),
  });
  page.drawText(`${(widthPt / PTS_PER_INCH).toFixed(2)} x ${(heightPt / PTS_PER_INCH).toFixed(2)} inches`, {
    x: widthPt / 2 - 80,
    y: heightPt / 2 - 30,
    size: 14,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  const bytes = await pdfDoc.save();
  const filePath = join(TEST_DIR, "landscape-test.pdf");
  await writeFile(filePath, bytes);
  return filePath;
}

async function createPortraitPdf(
  widthPt: number,
  heightPt: number
): Promise<string> {
  await mkdir(TEST_DIR, { recursive: true });
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage([widthPt, heightPt]);
  page.drawText("Portrait Page", {
    x: widthPt / 2 - 50,
    y: heightPt / 2,
    size: 24,
    font,
    color: rgb(0.7, 0.3, 0.1),
  });

  const bytes = await pdfDoc.save();
  const filePath = join(TEST_DIR, "portrait-test.pdf");
  await writeFile(filePath, bytes);
  return filePath;
}

describe("PDF to DOCX - landscape geometry regression (P0)", () => {
  it("landscape page: w:w > w:h in OOXML w:pgSz (Cosmic Atlas dims)", async () => {
    // Cosmic Atlas: 1376 x 768 pts = 19.11 x 10.67 inches
    const pdfPath = await createLandscapePdf(1376, 768);
    const storedName = pdfPath.split(/[\\/]/).pop()!;
    const fileStat = await stat(pdfPath);

    const result = await pdfToDocxConverter.convert(
      makeInput(storedName, "landscape-test.pdf", fileStat.size)
    );

    const docxBuffer = await readFile(result.outputPath);
    const zip = await JSZip.loadAsync(docxBuffer);
    const docXml = await zip.file("word/document.xml")!.async("string");

    const pgSz = parsePgSz(docXml);
    expect(pgSz).not.toBeNull();
    expect(pgSz!.orient).toBe("landscape");
    // w:w must be the LONGER dimension (19.11" = ~27520 twips)
    // w:h must be the SHORTER dimension (10.67" = ~15360 twips)
    expect(pgSz!.wTwips).toBeGreaterThan(pgSz!.hTwips);
    expect(pgSz!.wInches).toBeCloseTo(19.11, 1);
    expect(pgSz!.hInches).toBeCloseTo(10.67, 1);
  });

  it("portrait page: w:w < w:h in OOXML w:pgSz (letter dims)", async () => {
    // Letter: 612 x 792 pts = 8.5 x 11 inches
    const pdfPath = await createPortraitPdf(612, 792);
    const storedName = pdfPath.split(/[\\/]/).pop()!;
    const fileStat = await stat(pdfPath);

    const result = await pdfToDocxConverter.convert(
      makeInput(storedName, "portrait-test.pdf", fileStat.size)
    );

    const docxBuffer = await readFile(result.outputPath);
    const zip = await JSZip.loadAsync(docxBuffer);
    const docXml = await zip.file("word/document.xml")!.async("string");

    const pgSz = parsePgSz(docXml);
    expect(pgSz).not.toBeNull();
    expect(pgSz!.orient).toBe("portrait");
    // w:w must be the SHORTER dimension (8.5" = ~12240 twips)
    // w:h must be the LONGER dimension (11" = ~15840 twips)
    expect(pgSz!.wTwips).toBeLessThan(pgSz!.hTwips);
    expect(pgSz!.wInches).toBeCloseTo(8.5, 1);
    expect(pgSz!.hInches).toBeCloseTo(11, 1);
  });

  it("landscape image fits landscape page without overflow", async () => {
    // Landscape: 1376 x 768 pts
    const pdfPath = await createLandscapePdf(1376, 768);
    const storedName = pdfPath.split(/[\\/]/).pop()!;
    const fileStat = await stat(pdfPath);

    const result = await pdfToDocxConverter.convert(
      makeInput(storedName, "landscape-test.pdf", fileStat.size)
    );

    const docxBuffer = await readFile(result.outputPath);
    const zip = await JSZip.loadAsync(docxBuffer);
    const docXml = await zip.file("word/document.xml")!.async("string");

    // Check image wp:extent
    const extentMatch = docXml.match(/<wp:extent[^/]*\/>/);
    expect(extentMatch).not.toBeNull();

    const cxMatch = extentMatch![0].match(/cx="(\d+)"/);
    const cyMatch = extentMatch![0].match(/cy="(\d+)"/);
    expect(cxMatch).not.toBeNull();
    expect(cyMatch).not.toBeNull();

    const EMU_PER_INCH = 914400;
    const cxInches = parseInt(cxMatch![1]) / EMU_PER_INCH;
    const cyInches = parseInt(cyMatch![1]) / EMU_PER_INCH;

    // Image width > height for landscape
    expect(cxInches).toBeGreaterThan(cyInches);
    expect(cxInches).toBeCloseTo(19.11, 1);
    expect(cyInches).toBeCloseTo(10.67, 1);
  });
});
