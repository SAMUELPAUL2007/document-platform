import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type {
  EditorObject,
  TextObject,
  DrawingObject,
  HighlightObject,
  ShapeObject,
  ArrowObject,
  EditorState,
} from "../lib/workspace/editor-types";
import {
  loadPdfFromBytes,
  getPagesInfo,
} from "../lib/workspace/pdf-ops";
import { bakeObjectsIntoPdf } from "../lib/workspace/editor-ops";

const TEST_DIR = join(process.cwd(), ".tmp", "test-editor");

beforeAll(async () => {
  await mkdir(TEST_DIR, { recursive: true });
});

afterAll(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

async function createTestPdf(pageCount: number = 3): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.addPage([595.28, 841.89]);
    page.drawText(`Page ${i + 1}`, {
      x: 50,
      y: 800,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });
  }
  return pdfDoc.save();
}

function makeTextObject(overrides: Partial<TextObject> = {}): TextObject {
  return {
    id: "text_1",
    type: "text",
    pageIndex: 0,
    x: 50,
    y: 100,
    width: 200,
    height: 30,
    rotation: 0,
    locked: false,
    zIndex: 1,
    opacity: 1,
    text: "Hello World",
    fontFamily: "Helvetica",
    fontSize: 16,
    fontWeight: "normal",
    fontStyle: "normal",
    color: "#000000",
    textAlign: "left",
    lineHeight: 1.2,
    ...overrides,
  };
}

function makeDrawingObject(overrides: Partial<DrawingObject> = {}): DrawingObject {
  return {
    id: "draw_1",
    type: "drawing",
    pageIndex: 0,
    x: 10,
    y: 10,
    width: 100,
    height: 50,
    rotation: 0,
    locked: false,
    zIndex: 1,
    opacity: 1,
    points: [
      { x: 10, y: 10 },
      { x: 50, y: 30 },
      { x: 100, y: 50 },
    ],
    strokeColor: "#ff0000",
    strokeWidth: 2,
    ...overrides,
  };
}

function makeHighlightObject(overrides: Partial<HighlightObject> = {}): HighlightObject {
  return {
    id: "hl_1",
    type: "highlight",
    pageIndex: 0,
    x: 50,
    y: 200,
    width: 150,
    height: 20,
    rotation: 0,
    locked: false,
    zIndex: 1,
    opacity: 0.4,
    color: "#ffff00",
    ...overrides,
  };
}

function makeShapeObject(overrides: Partial<ShapeObject> = {}): ShapeObject {
  return {
    id: "shape_1",
    type: "rectangle",
    pageIndex: 0,
    x: 50,
    y: 300,
    width: 100,
    height: 80,
    rotation: 0,
    locked: false,
    zIndex: 1,
    opacity: 1,
    strokeColor: "#0000ff",
    strokeWidth: 2,
    fillColor: "transparent",
    ...overrides,
  };
}

function makeArrowObject(overrides: Partial<ArrowObject> = {}): ArrowObject {
  return {
    id: "arrow_1",
    type: "arrow",
    pageIndex: 0,
    x: 50,
    y: 400,
    width: 150,
    height: 100,
    rotation: 0,
    locked: false,
    zIndex: 1,
    opacity: 1,
    startX: 50,
    startY: 400,
    endX: 200,
    endY: 500,
    strokeColor: "#000000",
    strokeWidth: 2,
    ...overrides,
  };
}

describe("Editor Object Model", () => {
  it("creates a valid text object", () => {
    const obj = makeTextObject();
    expect(obj.type).toBe("text");
    expect(obj.text).toBe("Hello World");
    expect(obj.fontFamily).toBe("Helvetica");
    expect(obj.fontSize).toBe(16);
  });

  it("creates a valid drawing object with points", () => {
    const obj = makeDrawingObject();
    expect(obj.type).toBe("drawing");
    expect(obj.points).toHaveLength(3);
    expect(obj.strokeColor).toBe("#ff0000");
  });

  it("creates a valid highlight object", () => {
    const obj = makeHighlightObject();
    expect(obj.type).toBe("highlight");
    expect(obj.opacity).toBe(0.4);
  });

  it("creates a valid underline object", () => {
    const obj = makeHighlightObject({ type: "underline" });
    expect(obj.type).toBe("underline");
  });

  it("creates a valid strikethrough object", () => {
    const obj = makeHighlightObject({ type: "strikethrough" });
    expect(obj.type).toBe("strikethrough");
  });

  it("creates a valid rectangle shape", () => {
    const obj = makeShapeObject();
    expect(obj.type).toBe("rectangle");
    expect(obj.strokeColor).toBe("#0000ff");
  });

  it("creates a valid ellipse shape", () => {
    const obj = makeShapeObject({ type: "ellipse" });
    expect(obj.type).toBe("ellipse");
  });

  it("creates a valid line shape", () => {
    const obj = makeShapeObject({ type: "line" });
    expect(obj.type).toBe("line");
  });

  it("creates a valid arrow object", () => {
    const obj = makeArrowObject();
    expect(obj.type).toBe("arrow");
    expect(obj.startX).toBe(50);
    expect(obj.endX).toBe(200);
  });
});

describe("Editor State Operations", () => {
  it("objects can be serialized and deserialized", () => {
    const textObj = makeTextObject();
    const serialized = JSON.stringify(textObj);
    const deserialized = JSON.parse(serialized);
    expect(deserialized.type).toBe("text");
    expect(deserialized.text).toBe("Hello World");
  });

  it("drawing points preserve coordinates", () => {
    const obj = makeDrawingObject();
    const pts = obj.points.map((p) => ({ ...p }));
    expect(pts[0]).toEqual({ x: 10, y: 10 });
    expect(pts[2]).toEqual({ x: 100, y: 50 });
  });

  it("objects can be filtered by page index", () => {
    const objects: EditorObject[] = [
      makeTextObject({ pageIndex: 0 }),
      makeTextObject({ id: "text_2", pageIndex: 1 }),
      makeShapeObject({ pageIndex: 0 }),
      makeShapeObject({ id: "shape_2", pageIndex: 2 }),
    ];
    const page0 = objects.filter((o) => o.pageIndex === 0);
    expect(page0).toHaveLength(2);
  });

  it("z-index ordering works correctly", () => {
    const objects: EditorObject[] = [
      makeTextObject({ zIndex: 3 }),
      makeShapeObject({ zIndex: 1 }),
      makeDrawingObject({ zIndex: 2 }),
    ];
    const sorted = [...objects].sort((a, b) => a.zIndex - b.zIndex);
    expect(sorted[0].type).toBe("rectangle");
    expect(sorted[1].type).toBe("drawing");
    expect(sorted[2].type).toBe("text");
  });
});

describe("Bake Objects Into PDF", () => {
  it("bakes text objects into PDF", async () => {
    const pdfBytes = await createTestPdf(1);
    const state = await loadPdfFromBytes(pdfBytes);
    const objects = [makeTextObject()];
    const result = await bakeObjectsIntoPdf(state, objects);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
    const pages = await getPagesInfo(result);
    expect(pages).toHaveLength(1);
  });

  it("bakes drawing objects into PDF", async () => {
    const pdfBytes = await createTestPdf(1);
    const state = await loadPdfFromBytes(pdfBytes);
    const objects = [makeDrawingObject()];
    const result = await bakeObjectsIntoPdf(state, objects);
    expect(result.length).toBeGreaterThan(0);
  });

  it("bakes highlight objects into PDF", async () => {
    const pdfBytes = await createTestPdf(1);
    const state = await loadPdfFromBytes(pdfBytes);
    const objects = [makeHighlightObject()];
    const result = await bakeObjectsIntoPdf(state, objects);
    expect(result.length).toBeGreaterThan(0);
  });

  it("bakes underline objects into PDF", async () => {
    const pdfBytes = await createTestPdf(1);
    const state = await loadPdfFromBytes(pdfBytes);
    const objects = [makeHighlightObject({ type: "underline" })];
    const result = await bakeObjectsIntoPdf(state, objects);
    expect(result.length).toBeGreaterThan(0);
  });

  it("bakes strikethrough objects into PDF", async () => {
    const pdfBytes = await createTestPdf(1);
    const state = await loadPdfFromBytes(pdfBytes);
    const objects = [makeHighlightObject({ type: "strikethrough" })];
    const result = await bakeObjectsIntoPdf(state, objects);
    expect(result.length).toBeGreaterThan(0);
  });

  it("bakes rectangle shapes into PDF", async () => {
    const pdfBytes = await createTestPdf(1);
    const state = await loadPdfFromBytes(pdfBytes);
    const objects = [makeShapeObject({ type: "rectangle" })];
    const result = await bakeObjectsIntoPdf(state, objects);
    expect(result.length).toBeGreaterThan(0);
  });

  it("bakes ellipse shapes into PDF", async () => {
    const pdfBytes = await createTestPdf(1);
    const state = await loadPdfFromBytes(pdfBytes);
    const objects = [makeShapeObject({ type: "ellipse" })];
    const result = await bakeObjectsIntoPdf(state, objects);
    expect(result.length).toBeGreaterThan(0);
  });

  it("bakes line shapes into PDF", async () => {
    const pdfBytes = await createTestPdf(1);
    const state = await loadPdfFromBytes(pdfBytes);
    const objects = [makeShapeObject({ type: "line" })];
    const result = await bakeObjectsIntoPdf(state, objects);
    expect(result.length).toBeGreaterThan(0);
  });

  it("bakes arrow objects into PDF", async () => {
    const pdfBytes = await createTestPdf(1);
    const state = await loadPdfFromBytes(pdfBytes);
    const objects = [makeArrowObject()];
    const result = await bakeObjectsIntoPdf(state, objects);
    expect(result.length).toBeGreaterThan(0);
  });

  it("bakes multiple objects on multiple pages", async () => {
    const pdfBytes = await createTestPdf(3);
    const state = await loadPdfFromBytes(pdfBytes);
    const objects = [
      makeTextObject({ pageIndex: 0 }),
      makeTextObject({ id: "text_2", pageIndex: 1, text: "Page 2 text" }),
      makeShapeObject({ pageIndex: 2 }),
      makeDrawingObject({ pageIndex: 0 }),
    ];
    const result = await bakeObjectsIntoPdf(state, objects);
    const pages = await getPagesInfo(result);
    expect(pages).toHaveLength(3);
  });

  it("preserves original pages when baking empty objects", async () => {
    const pdfBytes = await createTestPdf(2);
    const state = await loadPdfFromBytes(pdfBytes);
    const result = await bakeObjectsIntoPdf(state, []);
    const pages = await getPagesInfo(result);
    expect(pages).toHaveLength(2);
  });

  it("bakes watermark objects into PDF", async () => {
    const pdfBytes = await createTestPdf(1);
    const state = await loadPdfFromBytes(pdfBytes);
    const objects: EditorObject[] = [
      {
        id: "wm_1",
        type: "watermark",
        pageIndex: 0,
        x: 0,
        y: 0,
        width: 595.28,
        height: 841.89,
        rotation: 0,
        locked: false,
        zIndex: 1,
        opacity: 0.15,
        variant: "text",
        text: "CONFIDENTIAL",
        fontFamily: "Helvetica",
        fontSize: 48,
        color: "#cccccc",
      },
    ];
    const result = await bakeObjectsIntoPdf(state, objects);
    expect(result.length).toBeGreaterThan(0);
  });

  it("bakes page number objects into PDF", async () => {
    const pdfBytes = await createTestPdf(3);
    const state = await loadPdfFromBytes(pdfBytes);
    const objects: EditorObject[] = [
      {
        id: "pn_1",
        type: "page-number",
        pageIndex: 0,
        x: 250,
        y: 800,
        width: 40,
        height: 20,
        rotation: 0,
        locked: false,
        zIndex: 1,
        opacity: 1,
        text: "{page} of {total}",
        fontFamily: "Helvetica",
        fontSize: 12,
        color: "#000000",
        format: "page-of-total",
      },
    ];
    const result = await bakeObjectsIntoPdf(state, objects);
    const pages = await getPagesInfo(result);
    expect(pages).toHaveLength(3);
  });

  it("handles objects on non-existent pages gracefully", async () => {
    const pdfBytes = await createTestPdf(1);
    const state = await loadPdfFromBytes(pdfBytes);
    const objects = [makeTextObject({ pageIndex: 5 })];
    const result = await bakeObjectsIntoPdf(state, objects);
    expect(result.length).toBeGreaterThan(0);
  });

  it("handles empty drawing gracefully", async () => {
    const pdfBytes = await createTestPdf(1);
    const state = await loadPdfFromBytes(pdfBytes);
    const objects = [makeDrawingObject({ points: [] })];
    const result = await bakeObjectsIntoPdf(state, objects);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("Save and Reopen", () => {
  it("saves edited PDF and reopens it", async () => {
    const pdfBytes = await createTestPdf(2);
    const state = await loadPdfFromBytes(pdfBytes);
    const objects = [
      makeTextObject({ pageIndex: 0 }),
      makeShapeObject({ pageIndex: 1 }),
    ];
    const savedBytes = await bakeObjectsIntoPdf(state, objects);
    const reopened = await loadPdfFromBytes(savedBytes);
    expect(reopened.pages).toHaveLength(2);
  });

  it("preserves page count after baking", async () => {
    const pdfBytes = await createTestPdf(5);
    const state = await loadPdfFromBytes(pdfBytes);
    const objects = [makeTextObject({ pageIndex: 2 })];
    const result = await bakeObjectsIntoPdf(state, objects);
    const pages = await getPagesInfo(result);
    expect(pages).toHaveLength(5);
  });

  it("preserves page dimensions after baking", async () => {
    const pdfBytes = await createTestPdf(1);
    const state = await loadPdfFromBytes(pdfBytes);
    const objects = [makeTextObject()];
    const result = await bakeObjectsIntoPdf(state, objects);
    const pages = await getPagesInfo(result);
    expect(pages[0].width).toBeCloseTo(595.28, 0);
    expect(pages[0].height).toBeCloseTo(841.89, 0);
  });
});
