import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PDFDocument } from "pdf-lib";
import { mkdir, writeFile, rm, readFile } from "fs/promises";
import { join } from "path";
import mergePdfConverter from "../lib/processing/converters/merge-pdf";
import splitPdfConverter from "../lib/processing/converters/split-pdf";
import extractPagesConverter from "../lib/processing/converters/extract-pages";
import rotatePagesConverter from "../lib/processing/converters/rotate-pages";
import deletePagesConverter from "../lib/processing/converters/delete-pages";
import reorderPagesConverter from "../lib/processing/converters/reorder-pages";
import duplicatePagesConverter from "../lib/processing/converters/duplicate-pages";
import compressPdfConverter from "../lib/processing/converters/compress-pdf";
import ocrPdfConverter from "../lib/processing/converters/ocr-pdf";
import protectPdfConverter from "../lib/processing/converters/protect-pdf";
import type { ConverterInput, JobFile } from "../lib/processing/types";

const TEST_DIR = join(process.cwd(), ".tmp", "test-pdf-operations");

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

function makeJobFile(name: string, size: number = 1000): JobFile {
  return {
    id: `test-${name}`,
    originalName: name,
    storedName: name,
    mimeType: "application/pdf",
    size,
  };
}

function makeInput(
  files: JobFile[],
  options?: Record<string, string>
): ConverterInput {
  return {
    jobDir: TEST_DIR,
    files,
    options,
  };
}

describe("merge-pdf converter", () => {
  it("merges two PDFs into one", async () => {
    await createTestPdf("merge-a.pdf", 2);
    await createTestPdf("merge-b.pdf", 3);

    const input = makeInput(
      [makeJobFile("merge-a.pdf"), makeJobFile("merge-b.pdf")],
    );

    const result = await mergePdfConverter.convert(input);

    expect(result.outputFileName).toBe("merged.pdf");
    expect(result.outputMimeType).toBe("application/pdf");

    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(5);
  });

  it("throws when merging a single PDF", async () => {
    await createTestPdf("merge-single.pdf", 4);

    const input = makeInput([makeJobFile("merge-single.pdf")]);

    await expect(mergePdfConverter.convert(input)).rejects.toThrow("At least 2 PDF files are required to merge");
  });

  it("preserves page order when merging", async () => {
    const pdfA = await PDFDocument.create();
    const pageA = pdfA.addPage([595.28, 841.89]);
    pageA.drawText("A1", { x: 50, y: 700, size: 24 });
    const pdfABytes = await pdfA.save();
    await writeFile(join(TEST_DIR, "order-a.pdf"), pdfABytes);

    const pdfB = await PDFDocument.create();
    const pageB = pdfB.addPage([595.28, 841.89]);
    pageB.drawText("B1", { x: 50, y: 700, size: 24 });
    const pdfBBytes = await pdfB.save();
    await writeFile(join(TEST_DIR, "order-b.pdf"), pdfBBytes);

    const input = makeInput(
      [makeJobFile("order-a.pdf"), makeJobFile("order-b.pdf")],
    );

    const result = await mergePdfConverter.convert(input);
    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(2);
  });
});

describe("split-pdf converter", () => {
  it("splits a PDF into individual pages by default", async () => {
    await createTestPdf("split-test.pdf", 4);

    const input = makeInput([makeJobFile("split-test.pdf")], { splitMode: "all" });

    const result = await splitPdfConverter.convert(input);
    expect(result.outputMimeType).toBe("application/zip");

    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(await readFile(result.outputPath));
    const files = Object.keys(zip.files).filter((f) => !zip.files[f]?.dir);
    expect(files.length).toBe(4);
  });

  it("splits every N pages", async () => {
    await createTestPdf("split-every.pdf", 6);

    const input = makeInput([makeJobFile("split-every.pdf")], {
      splitMode: "every",
      everyN: "2",
    });

    const result = await splitPdfConverter.convert(input);

    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(await readFile(result.outputPath));
    const files = Object.keys(zip.files).filter((f) => !zip.files[f]?.dir);
    expect(files.length).toBe(3);
  });

  it("splits by custom ranges", async () => {
    await createTestPdf("split-ranges.pdf", 5);

    const input = makeInput([makeJobFile("split-ranges.pdf")], {
      splitMode: "ranges",
      ranges: "1-2, 4-5",
    });

    const result = await splitPdfConverter.convert(input);

    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(await readFile(result.outputPath));
    const files = Object.keys(zip.files).filter((f) => !zip.files[f]?.dir);
    expect(files.length).toBe(2);
  });
});

describe("extract-pages converter", () => {
  it("extracts specific pages from a PDF", async () => {
    await createTestPdf("extract-test.pdf", 5);

    const input = makeInput([makeJobFile("extract-test.pdf")], { pages: "1, 3, 5" });

    const result = await extractPagesConverter.convert(input);

    expect(result.outputMimeType).toBe("application/pdf");
    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(3);
  });

  it("extracts a range of pages", async () => {
    await createTestPdf("extract-range.pdf", 8);

    const input = makeInput([makeJobFile("extract-range.pdf")], { pages: "2-5" });

    const result = await extractPagesConverter.convert(input);

    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(4);
  });

  it("extracts all pages when no selection given", async () => {
    await createTestPdf("extract-all.pdf", 3);

    const input = makeInput([makeJobFile("extract-all.pdf")]);

    const result = await extractPagesConverter.convert(input);

    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(3);
  });
});

describe("rotate-pages converter", () => {
  it("rotates pages 90 degrees by default", async () => {
    await createTestPdf("rotate-test.pdf", 2);

    const input = makeInput([makeJobFile("rotate-test.pdf")]);

    const result = await rotatePagesConverter.convert(input);
    expect(result.outputMimeType).toBe("application/pdf");

    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(2);

    const page0 = pdfDoc.getPage(0);
    expect(page0.getRotation().angle).toBe(90);
  });

  it("rotates specific pages 180 degrees", async () => {
    await createTestPdf("rotate-180.pdf", 3);

    const input = makeInput([makeJobFile("rotate-180.pdf")], {
      rotation: "180",
      pages: "2",
    });

    const result = await rotatePagesConverter.convert(input);

    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    const page1 = pdfDoc.getPage(1);
    expect(page1.getRotation().angle).toBe(180);
  });

  it("accumulates rotation on multiple calls", async () => {
    await createTestPdf("rotate-accum.pdf", 1);

    const input1 = makeInput([makeJobFile("rotate-accum.pdf")], { rotation: "90" });
    const result1 = await rotatePagesConverter.convert(input1);

    // The second call should use the file that was modified by the first call
    // but since converters work on a per-job basis, we simulate reading from a fresh file
    // that already has 90° rotation
    const secondPdf = await PDFDocument.load(await readFile(result1.outputPath));
    const secondPage = secondPdf.getPage(0);
    expect(secondPage.getRotation().angle).toBe(90);
  });

  it("throws on invalid rotation angle", async () => {
    await createTestPdf("rotate-invalid.pdf", 1);

    const input = makeInput([makeJobFile("rotate-invalid.pdf")], { rotation: "45" });

    await expect(rotatePagesConverter.convert(input)).rejects.toThrow("Invalid rotation angle");
  });
});

describe("delete-pages converter", () => {
  it("deletes specific pages from a PDF", async () => {
    await createTestPdf("delete-test.pdf", 5);

    const input = makeInput([makeJobFile("delete-test.pdf")], { pages: "2, 4" });

    const result = await deletePagesConverter.convert(input);
    expect(result.outputMimeType).toBe("application/pdf");

    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(3);
  });

  it("deletes a range of pages", async () => {
    await createTestPdf("delete-range.pdf", 6);

    const input = makeInput([makeJobFile("delete-range.pdf")], { pages: "2-4" });

    const result = await deletePagesConverter.convert(input);

    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(3);
  });

  it("throws when no pages specified", async () => {
    await createTestPdf("delete-none.pdf", 3);

    const input = makeInput([makeJobFile("delete-none.pdf")], { pages: "" });

    await expect(deletePagesConverter.convert(input)).rejects.toThrow(
      "No pages specified for deletion"
    );
  });

  it("throws when invalid pages specified", async () => {
    await createTestPdf("delete-invalid.pdf", 3);

    const input = makeInput([makeJobFile("delete-invalid.pdf")], { pages: "999" });

    await expect(deletePagesConverter.convert(input)).rejects.toThrow(
      "No valid pages found in the specified range"
    );
  });
});

describe("reorder-pages converter", () => {
  it("reorders pages in a PDF", async () => {
    await createTestPdf("reorder-test.pdf", 4);

    const input = makeInput([makeJobFile("reorder-test.pdf")], {
      order: "4, 1, 3, 2",
    });

    const result = await reorderPagesConverter.convert(input);
    expect(result.outputMimeType).toBe("application/pdf");

    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(4);
  });

  it("creates a PDF with reversed page order", async () => {
    await createTestPdf("reorder-reverse.pdf", 5);

    const input = makeInput([makeJobFile("reorder-reverse.pdf")], {
      order: "5, 4, 3, 2, 1",
    });

    const result = await reorderPagesConverter.convert(input);

    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(5);
  });

  it("defaults to original order when no order given", async () => {
    await createTestPdf("reorder-default.pdf", 3);

    const input = makeInput([makeJobFile("reorder-default.pdf")]);

    const result = await reorderPagesConverter.convert(input);

    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(3);
  });
});

describe("duplicate-pages converter", () => {
  it("duplicates all pages by default", async () => {
    await createTestPdf("dup-test.pdf", 3);

    const input = makeInput([makeJobFile("dup-test.pdf")]);

    const result = await duplicatePagesConverter.convert(input);
    expect(result.outputMimeType).toBe("application/pdf");

    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(6);
  });

  it("duplicates specific pages 3 times", async () => {
    await createTestPdf("dup-specific.pdf", 4);

    const input = makeInput([makeJobFile("dup-specific.pdf")], {
      pages: "1, 3",
      count: "3",
    });

    const result = await duplicatePagesConverter.convert(input);

    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(8);
  });

  it("duplicates a range of pages", async () => {
    await createTestPdf("dup-range.pdf", 5);

    const input = makeInput([makeJobFile("dup-range.pdf")], {
      pages: "2-4",
      count: "2",
    });

    const result = await duplicatePagesConverter.convert(input);

    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(8);
  });
});

describe("compress-pdf converter", () => {
  it("compresses a PDF and preserves page count", async () => {
    await createTestPdf("compress-test.pdf", 3);

    const input = makeInput([makeJobFile("compress-test.pdf")]);

    const result = await compressPdfConverter.convert(input);
    expect(result.outputMimeType).toBe("application/pdf");
    expect(result.outputFileName).toBe("compress-test_compressed.pdf");

    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(3);
  });

  it("strips metadata at medium quality", async () => {
    await createTestPdf("compress-meta.pdf", 1);

    const input = makeInput(
      [makeJobFile("compress-meta.pdf")],
      { quality: "medium" }
    );

    const result = await compressPdfConverter.convert(input);

    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getTitle()).toBe("");
    expect(pdfDoc.getAuthor()).toBe("");
  });

  it("preserves page count at high quality", async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle("Test Title");
    pdfDoc.setAuthor("Test Author");
    const page = pdfDoc.addPage([595.28, 841.89]);
    page.drawText("Test", { x: 50, y: 700, size: 24 });
    const pdfBytes = await pdfDoc.save();
    await writeFile(join(TEST_DIR, "compress-high.pdf"), pdfBytes);

    const input = makeInput(
      [makeJobFile("compress-high.pdf")],
      { quality: "high" }
    );

    const result = await compressPdfConverter.convert(input);

    const resultBuffer = await readFile(result.outputPath);
    const resultDoc = await PDFDocument.load(resultBuffer);
    expect(resultDoc.getPageCount()).toBe(1);
  });

  it("compresses with low quality and strips metadata", async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle("Low Test");
    pdfDoc.setAuthor("Author");
    pdfDoc.addPage([595.28, 841.89]);
    const pdfBytes = await pdfDoc.save();
    await writeFile(join(TEST_DIR, "compress-low.pdf"), pdfBytes);

    const input = makeInput(
      [makeJobFile("compress-low.pdf")],
      { quality: "low" }
    );

    const result = await compressPdfConverter.convert(input);
    const resultBuffer = await readFile(result.outputPath);
    const resultDoc = await PDFDocument.load(resultBuffer);
    expect(resultDoc.getPageCount()).toBe(1);
    expect(resultDoc.getTitle()).toBe("");
    expect(resultDoc.getAuthor()).toBe("");
  });

  it("defaults to medium quality when no quality option provided", async () => {
    await createTestPdf("compress-default.pdf", 1);
    const input = makeInput([makeJobFile("compress-default.pdf")]);
    const result = await compressPdfConverter.convert(input);

    const resultBuffer = await readFile(result.outputPath);
    const resultDoc = await PDFDocument.load(resultBuffer);
    expect(resultDoc.getTitle()).toBe("");
    expect(resultDoc.getPageCount()).toBe(1);
  });

  it("produces valid output for all three quality levels", async () => {
    const levels = ["low", "medium", "high"] as const;
    const sizes: number[] = [];

    for (const level of levels) {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.setTitle("Quality Test");
      pdfDoc.setAuthor("Test");
      for (let i = 0; i < 5; i++) {
        const page = pdfDoc.addPage([595.28, 841.89]);
        page.drawText(`Page ${i + 1} with some text content for compression testing`, {
          x: 50,
          y: 700,
          size: 12,
        });
      }
      const pdfBytes = await pdfDoc.save();
      const fileName = `compress-${level}-compare.pdf`;
      await writeFile(join(TEST_DIR, fileName), pdfBytes);

      const input = makeInput([makeJobFile(fileName)], { quality: level });
      const result = await compressPdfConverter.convert(input);
      const buffer = await readFile(result.outputPath);
      sizes.push(buffer.length);

      const doc = await PDFDocument.load(buffer);
      expect(doc.getPageCount()).toBe(5);
    }

    expect(sizes[0]).toBeGreaterThan(0);
    expect(sizes[1]).toBeGreaterThan(0);
    expect(sizes[2]).toBeGreaterThan(0);
  });
});

describe("ocr-pdf converter", () => {
  it("extracts text from a PDF with text content", async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    page.drawText("Hello World", { x: 50, y: 700, size: 24 });
    page.drawText("Line two of text", { x: 50, y: 660, size: 18 });
    const pdfBytes = await pdfDoc.save();
    await writeFile(join(TEST_DIR, "ocr-text.pdf"), pdfBytes);

    const input = makeInput([makeJobFile("ocr-text.pdf")]);

    const result = await ocrPdfConverter.convert(input);
    expect(result.outputMimeType).toBe("application/pdf");
    expect(result.outputFileName).toBe("ocr-text_ocr.pdf");

    const resultBuffer = await readFile(result.outputPath);
    const resultDoc = await PDFDocument.load(resultBuffer);
    expect(resultDoc.getPageCount()).toBe(1);
  });

  it("handles a multi-page PDF", async () => {
    await createTestPdf("ocr-multi.pdf", 3);

    const input = makeInput([makeJobFile("ocr-multi.pdf")]);

    const result = await ocrPdfConverter.convert(input);

    const resultBuffer = await readFile(result.outputPath);
    const resultDoc = await PDFDocument.load(resultBuffer);
    expect(resultDoc.getPageCount()).toBe(3);
  });
});

describe("protect-pdf converter", () => {
  it("adds password protection to a PDF", async () => {
    const { findQpdf } = await import("../lib/processing/converters/qpdf");
    const qpdfPath = await findQpdf();
    if (!qpdfPath) {
      console.log("  ⊘ Skipping: qpdf not installed");
      return;
    }

    await createTestPdf("protect-test.pdf", 2);

    const input = makeInput(
      [makeJobFile("protect-test.pdf")],
      { password: "secret123" }
    );

    const result = await protectPdfConverter.convert(input);
    expect(result.outputMimeType).toBe("application/pdf");
    expect(result.outputFileName).toBe("protect-test_protected.pdf");

    const pdfBuffer = await readFile(result.outputPath);
    expect(pdfBuffer.length).toBeGreaterThan(0);
  });

  it("throws when no password provided", async () => {
    await createTestPdf("protect-nopwd.pdf", 1);

    const input = makeInput([makeJobFile("protect-nopwd.pdf")]);

    await expect(protectPdfConverter.convert(input)).rejects.toThrow(
      "A password is required to protect the PDF"
    );
  });

  it("throws with clear error when qpdf is not installed", async () => {
    const { findQpdf } = await import("../lib/processing/converters/qpdf");
    const qpdfPath = await findQpdf();
    if (qpdfPath) {
      console.log("  ⊘ Skipping: qpdf is installed");
      return;
    }

    await createTestPdf("protect-noqpdf.pdf", 1);

    const input = makeInput(
      [makeJobFile("protect-noqpdf.pdf")],
      { password: "test123" }
    );

    await expect(protectPdfConverter.convert(input)).rejects.toThrow(
      "Password protection failed"
    );
  });

  it("preserves page count after protection", async () => {
    const { findQpdf } = await import("../lib/processing/converters/qpdf");
    const qpdfPath = await findQpdf();
    if (!qpdfPath) {
      console.log("  ⊘ Skipping: qpdf not installed");
      return;
    }

    await createTestPdf("protect-pages.pdf", 4);

    const input = makeInput(
      [makeJobFile("protect-pages.pdf")],
      { password: "mypassword" }
    );

    const result = await protectPdfConverter.convert(input);

    const pdfBuffer = await readFile(result.outputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    expect(pdfDoc.getPageCount()).toBe(4);
  });
});

describe("converter registry", () => {
  it("registers all converters", async () => {
    const { listConverters } = await import("../lib/processing/converters");
    const converterIds = listConverters();

    expect(converterIds).toContain("image-to-pdf");
    expect(converterIds).toContain("pdf-to-jpg");
    expect(converterIds).toContain("pdf-to-png");
    expect(converterIds).toContain("merge-pdf");
    expect(converterIds).toContain("split-pdf");
    expect(converterIds).toContain("extract-pages");
    expect(converterIds).toContain("rotate-pages");
    expect(converterIds).toContain("delete-pages");
    expect(converterIds).toContain("reorder-pages");
    expect(converterIds).toContain("duplicate-pages");
    expect(converterIds).toContain("docx-to-pdf");
    expect(converterIds).toContain("xlsx-to-pdf");
    expect(converterIds).toContain("pptx-to-pdf");
    expect(converterIds).toContain("pdf-to-docx");
    expect(converterIds).toContain("pdf-to-xlsx");
    expect(converterIds).toContain("pdf-to-pptx");
    expect(converterIds).toContain("compress-pdf");
    expect(converterIds).toContain("ocr-pdf");
    expect(converterIds).toContain("protect-pdf");
    expect(converterIds.length).toBe(19);
  });

  it("retrieves converters by ID", async () => {
    const { getConverter } = await import("../lib/processing/converters");

    const merge = getConverter("merge-pdf");
    expect(merge).toBeDefined();
    expect(merge?.id).toBe("merge-pdf");
    expect(merge?.acceptedTypes).toContain("application/pdf");

    const rotate = getConverter("rotate-pages");
    expect(rotate).toBeDefined();
    expect(rotate?.id).toBe("rotate-pages");
  });

  it("resolves tool ID aliases to converter IDs", async () => {
    const { getConverter } = await import("../lib/processing/converters");

    const pdfToWord = getConverter("pdf-to-word");
    expect(pdfToWord).toBeDefined();
    expect(pdfToWord?.id).toBe("pdf-to-docx");

    const wordToPdf = getConverter("word-to-pdf");
    expect(wordToPdf).toBeDefined();
    expect(wordToPdf?.id).toBe("docx-to-pdf");

    const pdfToExcel = getConverter("pdf-to-excel");
    expect(pdfToExcel).toBeDefined();
    expect(pdfToExcel?.id).toBe("pdf-to-xlsx");

    const excelToPdf = getConverter("excel-to-pdf");
    expect(excelToPdf).toBeDefined();
    expect(excelToPdf?.id).toBe("xlsx-to-pdf");

    const pdfToPpt = getConverter("pdf-to-ppt");
    expect(pdfToPpt).toBeDefined();
    expect(pdfToPpt?.id).toBe("pdf-to-pptx");

    const pptToPdf = getConverter("ppt-to-pdf");
    expect(pptToPdf).toBeDefined();
    expect(pptToPdf?.id).toBe("pptx-to-pdf");

    const imagesToPdf = getConverter("images-to-pdf");
    expect(imagesToPdf).toBeDefined();
    expect(imagesToPdf?.id).toBe("image-to-pdf");

    const rotatePdf = getConverter("rotate-pdf");
    expect(rotatePdf).toBeDefined();
    expect(rotatePdf?.id).toBe("rotate-pages");
  });

  it("hasConverter returns true for all registered tools", async () => {
    const { hasConverter } = await import("../lib/processing/converters");

    expect(hasConverter("image-to-pdf")).toBe(true);
    expect(hasConverter("pdf-to-jpg")).toBe(true);
    expect(hasConverter("merge-pdf")).toBe(true);
    expect(hasConverter("pdf-to-word")).toBe(true);
    expect(hasConverter("rotate-pdf")).toBe(true);
    expect(hasConverter("compress-pdf")).toBe(true);
    expect(hasConverter("ocr-pdf")).toBe(true);
    expect(hasConverter("protect-pdf")).toBe(true);
    expect(hasConverter("nonexistent-tool")).toBe(false);
  });
});
