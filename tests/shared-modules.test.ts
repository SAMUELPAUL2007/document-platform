import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdir, rm, writeFile, readFile } from "fs/promises";
import { join } from "path";
import { PDFDocument } from "pdf-lib";
import { renderPageToImage, extractTextLines, DEFAULT_RENDER_SCALE } from "../lib/processing/render";
import {
  extractTextItems,
  clusterIntoLines,
  detectColumns,
  calculateConfidence,
  analyzePage,
  selectPageMode,
  detectTable,
  isHeadingLine,
  getHeadingSize,
  buildDocumentProfile,
} from "../lib/processing/page-analysis";
import {
  validateOutput,
  validateLibreOfficePdf,
  validateOoxmlOutput,
} from "../lib/processing/validate";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const TEST_DIR = join(process.cwd(), ".tmp", "test-shared-modules");

async function makePdf(pages: number = 1): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    doc.addPage([612, 792]);
  }
  return new Uint8Array(await doc.save());
}

beforeAll(async () => {
  await mkdir(TEST_DIR, { recursive: true });
});

afterAll(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

// ─── render.ts ──────────────────────────────────────────────

describe("render.ts - renderPageToImage", () => {
  it("renders a page and returns PNG buffer with correct dimensions", async () => {
    const pdfBuf = await makePdf(1);
    const doc = await pdfjsLib.getDocument({ data: pdfBuf }).promise;
    const result = await renderPageToImage(doc, 0);

    expect(result.pngBuffer).toBeInstanceOf(Buffer);
    expect(result.pngBuffer.length).toBeGreaterThan(1000);
    expect(result.widthPt).toBeCloseTo(612, 0);
    expect(result.heightPt).toBeCloseTo(792, 0);

    // Verify it's valid PNG (magic bytes)
    expect(result.pngBuffer[0]).toBe(0x89);
    expect(result.pngBuffer[1]).toBe(0x50); // P
    expect(result.pngBuffer[2]).toBe(0x4e); // N
    expect(result.pngBuffer[3]).toBe(0x47); // G
  });

  it("respects custom scale parameter", async () => {
    const pdfBuf = await makePdf(1);
    const doc = await pdfjsLib.getDocument({ data: pdfBuf }).promise;
    const scale1 = await renderPageToImage(doc, 0, 1);
    const scale3 = await renderPageToImage(doc, 0, 3);

    // Higher scale → larger PNG buffer
    expect(scale3.pngBuffer.length).toBeGreaterThan(scale1.pngBuffer.length);
    // Unscaled dimensions should remain the same
    expect(scale1.widthPt).toBeCloseTo(612, 0);
    expect(scale3.widthPt).toBeCloseTo(612, 0);
  });

  it("returns correct page dimensions for landscape page", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([792, 612]); // landscape
    const pdfBuf = new Uint8Array(await doc.save());
    const pdfDoc = await pdfjsLib.getDocument({ data: pdfBuf }).promise;
    const result = await renderPageToImage(pdfDoc, 0);

    expect(result.widthPt).toBeCloseTo(792, 0);
    expect(result.heightPt).toBeCloseTo(612, 0);
  });
});

describe("render.ts - extractTextLines", () => {
  it("clusters text items into lines by Y position", () => {
    const content = {
      items: [
        { str: "Hello", transform: [1, 0, 0, 1, 10, 700], width: 50, height: 12 },
        { str: "World", transform: [1, 0, 0, 1, 70, 700], width: 50, height: 12 },
        { str: "Second", transform: [1, 0, 0, 1, 10, 680], width: 50, height: 12 },
        { str: "Line", transform: [1, 0, 0, 1, 70, 680], width: 50, height: 12 },
      ],
    } as any;

    const lines = extractTextLines(content);
    expect(lines.length).toBe(2);
    expect(lines[0]).toContain("Hello");
    expect(lines[0]).toContain("World");
    expect(lines[1]).toContain("Second");
    expect(lines[1]).toContain("Line");
  });

  it("returns empty array for empty content", () => {
    const lines = extractTextLines({ items: [] } as any);
    expect(lines).toEqual([]);
  });
});

// ─── page-analysis.ts ───────────────────────────────────────

describe("page-analysis.ts - extractTextItems", () => {
  it("extracts text items and computes font sizes", () => {
    const content = {
      items: [
        { str: "Title", transform: [2, 0, 0, 2, 10, 700], width: 100, height: 24 },
        { str: "Body", transform: [1, 0, 0, 1, 10, 650], width: 50, height: 12 },
      ],
    } as any;

    const items = extractTextItems(content);
    expect(items.length).toBe(2);
    expect(items[0].str).toBe("Title");
    expect(items[0].fontSize).toBeCloseTo(2, 0);
    expect(items[0].x).toBe(10);
    expect(items[0].y).toBe(700);
    expect(items[1].fontSize).toBeCloseTo(1, 0);
  });

  it("filters out empty/whitespace items", () => {
    const content = {
      items: [
        { str: "  ", transform: [1, 0, 0, 1, 10, 700], width: 10, height: 12 },
        { str: "Text", transform: [1, 0, 0, 1, 10, 680], width: 40, height: 12 },
        { str: "", transform: [1, 0, 0, 1, 10, 660], width: 10, height: 12 },
      ],
    } as any;

    const items = extractTextItems(content);
    expect(items.length).toBe(1);
    expect(items[0].str).toBe("Text");
  });
});

describe("page-analysis.ts - clusterIntoLines", () => {
  it("clusters items with same Y into one line", () => {
    const items = [
      { str: "A", x: 10, y: 700, width: 10, height: 12, fontSize: 12 },
      { str: "B", x: 30, y: 700, width: 10, height: 12, fontSize: 12 },
      { str: "C", x: 10, y: 680, width: 10, height: 12, fontSize: 12 },
    ];

    const lines = clusterIntoLines(items);
    expect(lines.length).toBe(2);
    expect(lines[0].text).toBe("A B");
    expect(lines[1].text).toBe("C");
  });

  it("returns empty for empty items", () => {
    expect(clusterIntoLines([])).toEqual([]);
  });
});

describe("page-analysis.ts - detectColumns", () => {
  it("returns single column for few lines", () => {
    const lines = [
      { items: [], y: 700, x: 10, width: 200, text: "A" },
      { items: [], y: 680, x: 10, width: 200, text: "B" },
    ];
    const cols = detectColumns(lines, 612);
    expect(cols.length).toBe(1);
  });

  it("detects two-column layout when gap is wide enough", () => {
    const lines = [];
    for (let i = 0; i < 10; i++) {
      lines.push({ items: [], y: 700 - i * 20, x: 10, width: 150, text: "Left " + i });
      lines.push({ items: [], y: 700 - i * 20, x: 420, width: 150, text: "Right " + i });
    }
    const cols = detectColumns(lines, 612);
    expect(cols.length).toBe(2);
  });
});

describe("page-analysis.ts - calculateConfidence", () => {
  it("returns high confidence for text-heavy content", () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      str: "word".repeat(5),
      x: 10, y: 700 - i * 20, width: 100, height: 12, fontSize: 12,
    }));
    const lines = clusterIntoLines(items);
    const totalLen = lines.reduce((s, l) => s + l.text.length, 0);
    const confidence = calculateConfidence(items, lines, totalLen, 792);
    expect(confidence).toBeGreaterThanOrEqual(0.5);
  });

  it("returns low confidence for minimal text", () => {
    const items = [{ str: "Hi", x: 10, y: 700, width: 20, height: 12, fontSize: 12 }];
    const lines = clusterIntoLines(items);
    const confidence = calculateConfidence(items, lines, 2, 792);
    expect(confidence).toBeLessThan(0.5);
  });
});

describe("page-analysis.ts - analyzePage", () => {
  it("returns full analysis with lines, columns, confidence", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      str: `Line ${i} has enough text to be meaningful content`,
      x: 10, y: 700 - i * 20, width: 300, height: 12, fontSize: 12,
    }));

    const analysis = analyzePage(items, 612, 792);
    expect(analysis.textItems.length).toBe(10);
    expect(analysis.lines.length).toBeGreaterThan(0);
    expect(analysis.confidence).toBeGreaterThanOrEqual(0);
    expect(analysis.confidence).toBeLessThanOrEqual(1);
    expect(analysis.columnCount).toBeGreaterThanOrEqual(1);
  });
});

describe("page-analysis.ts - selectPageMode", () => {
  it("selects text mode for high-confidence analysis", () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      str: "Word ".repeat(10),
      x: 10, y: 700 - i * 20, width: 200, height: 12, fontSize: 12,
    }));
    const analysis = analyzePage(items, 612, 792);
    const mode = selectPageMode(analysis);
    expect(["text", "image"]).toContain(mode);
  });
});

describe("page-analysis.ts - detectTable", () => {
  it("detects a structured table with consistent columns", () => {
    const items = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        items.push({
          str: `R${row}C${col}`,
          x: col * 150 + 10,
          y: 700 - row * 20,
          width: 80,
          height: 12,
          fontSize: 12,
        });
      }
    }

    const result = detectTable(items);
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.table.length).toBe(5);
    expect(result.table[0].length).toBe(3);
  });

  it("returns low confidence for unstructured text", () => {
    const items = [
      { str: "A", x: 10, y: 700, width: 30, height: 12, fontSize: 12 },
      { str: "B", x: 50, y: 700, width: 30, height: 12, fontSize: 12 },
      { str: "C", x: 100, y: 700, width: 30, height: 12, fontSize: 12 },
      { str: "D", x: 150, y: 700, width: 30, height: 12, fontSize: 12 },
      { str: "E", x: 10, y: 660, width: 30, height: 12, fontSize: 12 },
    ];
    const result = detectTable(items);
    expect(result.confidence).toBeLessThan(0.8);
  });

  it("returns empty for no items", () => {
    const result = detectTable([]);
    expect(result.table).toEqual([]);
    expect(result.confidence).toBe(0);
  });
});

describe("page-analysis.ts - isHeadingLine", () => {
  it("detects ALL CAPS lines as headings", () => {
    expect(isHeadingLine("CHAPTER ONE")).toBe(true);
  });

  it("detects numbered sections as headings", () => {
    expect(isHeadingLine("1. Introduction")).toBe(true);
    expect(isHeadingLine("2) Methods")).toBe(true);
  });

  it("detects Chapter/Section/Part as headings", () => {
    expect(isHeadingLine("Chapter 5 Results")).toBe(true);
    expect(isHeadingLine("Section 2.1")).toBe(true);
    expect(isHeadingLine("Part I")).toBe(true);
  });

  it("detects short capitalized lines as headings", () => {
    expect(isHeadingLine("The Solar System")).toBe(true);
  });

  it("rejects long paragraphs", () => {
    expect(isHeadingLine("This is a very long sentence that goes on and on and should not be detected as a heading because it exceeds the maximum length threshold of one hundred and fifty characters easily")).toBe(false);
  });

  it("rejects very short strings", () => {
    expect(isHeadingLine("Hi")).toBe(false);
  });
});

describe("page-analysis.ts - getHeadingSize", () => {
  it("returns largest size for ALL CAPS", () => {
    expect(getHeadingSize("CHAPTER TITLE")).toBe(32);
  });

  it("returns medium size for Chapter/Section/Part", () => {
    expect(getHeadingSize("Chapter 1")).toBe(30);
    expect(getHeadingSize("Section 2.1")).toBe(30);
  });

  it("returns smallest size for other headings", () => {
    expect(getHeadingSize("The Solar System")).toBe(26);
  });
});

describe("page-analysis.ts - buildDocumentProfile", () => {
  it("builds profile from page decisions", () => {
    const decisions = [
      { pageIndex: 0, mode: "text" as const, analysis: { textItems: new Array(10), confidence: 0.7 } as any },
      { pageIndex: 1, mode: "text" as const, analysis: { textItems: new Array(8), confidence: 0.6 } as any },
      { pageIndex: 2, mode: "text" as const, analysis: { textItems: new Array(6), confidence: 0.5 } as any },
      { pageIndex: 3, mode: "image" as const, analysis: { textItems: new Array(2), confidence: 0.2 } as any },
    ];

    const profile = buildDocumentProfile(decisions);
    expect(profile.numPages).toBe(4);
    expect(profile.textPages).toBe(3);
    expect(profile.visualPages).toBe(1);
    expect(profile.isTextHeavy).toBe(true);
    expect(profile.isVisual).toBe(false);
  });
});

// ─── validate.ts ────────────────────────────────────────────

describe("validate.ts - validateOutput", () => {
  it("validates a real PDF file", async () => {
    const pdfPath = join(TEST_DIR, "test-validate.pdf");
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]);
    const bytes = await doc.save();
    await writeFile(pdfPath, bytes);

    const result = await validateOutput(pdfPath, "application/pdf", { minPages: 1 });
    expect(result.valid).toBe(true);
    expect(result.outputSize).toBeGreaterThan(0);
    expect(result.issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("rejects empty files", async () => {
    const emptyPath = join(TEST_DIR, "empty.pdf");
    await writeFile(emptyPath, Buffer.alloc(0));

    const result = await validateOutput(emptyPath, "application/pdf");
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "EMPTY_FILE")).toBe(true);
  });

  it("warns on small files", async () => {
    const smallPath = join(TEST_DIR, "small.pdf");
    await writeFile(smallPath, Buffer.alloc(50));

    const result = await validateOutput(smallPath, "application/pdf", { minSize: 100 });
    expect(result.issues.some((i) => i.code === "SMALL_FILE")).toBe(true);
  });

  it("errors on wrong magic bytes for PDF", async () => {
    const wrongPath = join(TEST_DIR, "wrong.pdf");
    await writeFile(wrongPath, Buffer.from("NOT A PDF FILE"));

    const result = await validateOutput(wrongPath, "application/pdf");
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "WRONG_MAGIC")).toBe(true);
  });

  it("returns error for missing file", async () => {
    const result = await validateOutput(join(TEST_DIR, "nonexistent.pdf"), "application/pdf");
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "FILE_READ_ERROR")).toBe(true);
  });
});

describe("validate.ts - validateLibreOfficePdf", () => {
  it("validates a PDF with correct page count", async () => {
    const pdfPath = join(TEST_DIR, "lo-test.pdf");
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]);
    doc.addPage([612, 792]);
    await writeFile(pdfPath, Buffer.from(await doc.save()));

    const result = await validateLibreOfficePdf(pdfPath, 2);
    expect(result.valid).toBe(true);
  });
});

describe("validate.ts - validateOoxmlOutput", () => {
  it("validates a ZIP file as OOXML", async () => {
    const zipPath = join(TEST_DIR, "test.docx");
    // Create a valid ZIP with PK header
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("test.xml", "<root/>");
    const buf = await zip.generateAsync({ type: "nodebuffer" });
    await writeFile(zipPath, buf);

    const result = await validateOoxmlOutput(zipPath, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(result.valid).toBe(true);
  });

  it("rejects non-ZIP files as OOXML", async () => {
    const fakePath = join(TEST_DIR, "fake.docx");
    await writeFile(fakePath, Buffer.from("Not a ZIP file"));

    const result = await validateOoxmlOutput(fakePath, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "WRONG_MAGIC")).toBe(true);
  });
});
