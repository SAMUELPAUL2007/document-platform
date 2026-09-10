import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  loadPdfFromBytes,
  deletePages,
  rotatePages,
  reorderPage,
  reorderPagesMulti,
  duplicatePages,
  extractPages,
  insertPages,
  replacePages,
  mergePdf,
  cropPage,
  getPagesInfo,
} from "../lib/workspace/pdf-ops";
import type { DocumentState } from "../lib/workspace/types";

const TEST_DIR = join(process.cwd(), ".tmp", "test-workspace");

beforeAll(async () => {
  await mkdir(TEST_DIR, { recursive: true });
});

afterAll(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

async function createTestPdf(
  text: string = "Hello World",
  pageCount: number = 3
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.addPage([595.28, 841.89]);
    page.drawText(`${text} - Page ${i + 1}`, {
      x: 50,
      y: 800,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });
  }

  return pdfDoc.save();
}

async function createSinglePagePdf(
  text: string = "Single page"
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page = pdfDoc.addPage([400, 600]);
  page.drawText(text, { x: 50, y: 500, size: 14, font });
  return pdfDoc.save();
}

async function getState(bytes: Uint8Array): Promise<DocumentState> {
  return loadPdfFromBytes(bytes);
}

describe("PDF Operations - loadPdfFromBytes", () => {
  it("loads a PDF and extracts page info", async () => {
    const bytes = await createTestPdf("Test", 3);
    const state = await getState(bytes);

    expect(state.pages).toHaveLength(3);
    expect(state.pages[0].index).toBe(0);
    expect(state.pages[0].width).toBeCloseTo(595.28, 0);
    expect(state.pages[0].height).toBeCloseTo(841.89, 0);
  });

  it("loads a single-page PDF", async () => {
    const bytes = await createSinglePagePdf();
    const state = await getState(bytes);

    expect(state.pages).toHaveLength(1);
    expect(state.pdfBytes.length).toBeGreaterThan(0);
  });
});

describe("PDF Operations - deletePages", () => {
  it("deletes a single page", async () => {
    const bytes = await createTestPdf("Test", 3);
    const state = await getState(bytes);
    const result = await deletePages(state, [1]);
    const newPages = await getPagesInfo(result);

    expect(newPages).toHaveLength(2);
  });

  it("deletes multiple pages", async () => {
    const bytes = await createTestPdf("Test", 5);
    const state = await getState(bytes);
    const result = await deletePages(state, [0, 2, 4]);
    const newPages = await getPagesInfo(result);

    expect(newPages).toHaveLength(2);
  });

  it("deletes from back to front correctly", async () => {
    const bytes = await createTestPdf("Test", 4);
    const state = await getState(bytes);
    const result = await deletePages(state, [3, 1]);
    const newPages = await getPagesInfo(result);

    expect(newPages).toHaveLength(2);
  });

  it("returns original bytes when no indices", async () => {
    const bytes = await createTestPdf("Test", 2);
    const state = await getState(bytes);
    const result = await deletePages(state, []);

    expect(result).toEqual(bytes);
  });
});

describe("PDF Operations - rotatePages", () => {
  it("rotates a page 90 degrees", async () => {
    const bytes = await createTestPdf("Test", 2);
    const state = await getState(bytes);
    const result = await rotatePages(state, [0], 90);
    const pdfDoc = await PDFDocument.load(result);
    const page = pdfDoc.getPage(0);

    expect(page.getRotation().angle).toBe(90);
    expect(pdfDoc.getPageCount()).toBe(2);
  });

  it("rotates multiple pages", async () => {
    const bytes = await createTestPdf("Test", 3);
    const state = await getState(bytes);
    const result = await rotatePages(state, [0, 2], 180);
    const newPages = await getPagesInfo(result);

    expect(newPages).toHaveLength(3);
  });

  it("accumulates rotation", async () => {
    const bytes = await createTestPdf("Test", 1);
    const state = await getState(bytes);
    const result1 = await rotatePages(state, [0], 90);
    const state1 = await getState(result1);
    const result2 = await rotatePages(state1, [0], 90);
    const newPages = await getPagesInfo(result2);

    expect(newPages[0].width).toBeCloseTo(595.28, 0);
    expect(newPages[0].height).toBeCloseTo(841.89, 0);
  });
});

describe("PDF Operations - reorderPage", () => {
  it("moves a page forward", async () => {
    const bytes = await createTestPdf("Test", 3);
    const state = await getState(bytes);
    const result = await reorderPage(state, 0, 2);
    const newPages = await getPagesInfo(result);

    expect(newPages).toHaveLength(3);
  });

  it("moves a page backward", async () => {
    const bytes = await createTestPdf("Test", 3);
    const state = await getState(bytes);
    const result = await reorderPage(state, 2, 0);
    const newPages = await getPagesInfo(result);

    expect(newPages).toHaveLength(3);
  });
});

describe("PDF Operations - reorderPagesMulti", () => {
  it("moves multiple selected pages", async () => {
    const bytes = await createTestPdf("Test", 5);
    const state = await getState(bytes);
    const result = await reorderPagesMulti(state, [0, 2], 4);
    const newPages = await getPagesInfo(result);

    expect(newPages).toHaveLength(5);
  });
});

describe("PDF Operations - duplicatePages", () => {
  it("duplicates a single page", async () => {
    const bytes = await createTestPdf("Test", 3);
    const state = await getState(bytes);
    const result = await duplicatePages(state, [1]);
    const newPages = await getPagesInfo(result);

    expect(newPages).toHaveLength(4);
  });

  it("duplicates multiple pages", async () => {
    const bytes = await createTestPdf("Test", 3);
    const state = await getState(bytes);
    const result = await duplicatePages(state, [0, 2]);
    const newPages = await getPagesInfo(result);

    expect(newPages).toHaveLength(5);
  });

  it("returns original when no indices", async () => {
    const bytes = await createTestPdf("Test", 2);
    const state = await getState(bytes);
    const result = await duplicatePages(state, []);

    expect(result).toEqual(bytes);
  });
});

describe("PDF Operations - extractPages", () => {
  it("extracts a single page into new PDF", async () => {
    const bytes = await createTestPdf("Test", 5);
    const state = await getState(bytes);
    const result = await extractPages(state, [2]);
    const newPages = await getPagesInfo(result);

    expect(newPages).toHaveLength(1);
  });

  it("extracts multiple pages", async () => {
    const bytes = await createTestPdf("Test", 5);
    const state = await getState(bytes);
    const result = await extractPages(state, [0, 3, 4]);
    const newPages = await getPagesInfo(result);

    expect(newPages).toHaveLength(3);
  });
});

describe("PDF Operations - insertPages", () => {
  it("inserts pages after a given index", async () => {
    const bytes = await createTestPdf("Original", 3);
    const state = await getState(bytes);
    const insertBytes = await createSinglePagePdf("Inserted");
    const result = await insertPages(state, 1, insertBytes);
    const newPages = await getPagesInfo(result);

    expect(newPages).toHaveLength(4);
  });

  it("inserts at the beginning", async () => {
    const bytes = await createTestPdf("Original", 2);
    const state = await getState(bytes);
    const insertBytes = await createSinglePagePdf("First");
    const result = await insertPages(state, -1, insertBytes);
    const newPages = await getPagesInfo(result);

    expect(newPages).toHaveLength(3);
  });
});

describe("PDF Operations - replacePages", () => {
  it("replaces a page with a different PDF", async () => {
    const bytes = await createTestPdf("Original", 3);
    const state = await getState(bytes);
    const replBytes = await createSinglePagePdf("Replacement");
    const result = await replacePages(state, [1], replBytes);
    const newPages = await getPagesInfo(result);

    expect(newPages).toHaveLength(3);
  });

  it("replaces multiple pages", async () => {
    const bytes = await createTestPdf("Original", 5);
    const state = await getState(bytes);
    const replBytes = await createSinglePagePdf("Replacement");
    const result = await replacePages(state, [0, 2, 4], replBytes);
    const newPages = await getPagesInfo(result);

    expect(newPages).toHaveLength(3);
  });
});

describe("PDF Operations - mergePdf", () => {
  it("merges at the end by default", async () => {
    const bytes = await createTestPdf("Original", 2);
    const state = await getState(bytes);
    const mergeBytes = await createTestPdf("Merged", 3);
    const result = await mergePdf(state, mergeBytes);
    const newPages = await getPagesInfo(result);

    expect(newPages).toHaveLength(5);
  });

  it("merges at a specific position", async () => {
    const bytes = await createTestPdf("Original", 2);
    const state = await getState(bytes);
    const mergeBytes = await createTestPdf("Merged", 2);
    const result = await mergePdf(state, mergeBytes, 1);
    const newPages = await getPagesInfo(result);

    expect(newPages).toHaveLength(4);
  });
});

describe("PDF Operations - cropPage", () => {
  it("crops a page to specified dimensions", async () => {
    const bytes = await createTestPdf("Test", 1);
    const state = await getState(bytes);
    const result = await cropPage(state, 0, 50, 50, 300, 400);
    const newPages = await getPagesInfo(result);

    expect(newPages).toHaveLength(1);
  });
});

describe("PDF Operations - getPagesInfo", () => {
  it("returns correct page count", async () => {
    const bytes = await createTestPdf("Test", 7);
    const pages = await getPagesInfo(bytes);

    expect(pages).toHaveLength(7);
    expect(pages.map((p) => p.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});
