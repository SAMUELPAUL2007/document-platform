import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { PDFDocument } from "pdf-lib";
import type { Converter, ConverterInput, ConverterResult } from "../types";

function parseSplitOptions(
  options?: Record<string, string>
): { mode: "all" | "every" | "ranges"; everyN?: number; ranges?: string } {
  const mode = (options?.splitMode as "all" | "every" | "ranges") || "all";
  if (mode === "every") {
    const everyN = parseInt(options?.everyN || "1", 10);
    return { mode: "every", everyN: isNaN(everyN) || everyN < 1 ? 1 : everyN };
  }
  if (mode === "ranges") {
    return { mode: "ranges", ranges: options?.ranges || "" };
  }
  return { mode: "all" };
}

function parseRangeString(
  rangeStr: string,
  totalPages: number
): number[][] {
  const ranges: number[][] = [];
  const parts = rangeStr.split(",");

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes("-")) {
      const [startStr, endStr] = trimmed.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (isNaN(start) || isNaN(end)) continue;
      const s = Math.max(1, Math.min(start, totalPages));
      const e = Math.max(1, Math.min(end, totalPages));
      const pages: number[] = [];
      for (let i = s; i <= e; i++) pages.push(i - 1);
      if (pages.length > 0) ranges.push(pages);
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 1 && num <= totalPages) {
        ranges.push([num - 1]);
      }
    }
  }

  return ranges;
}

const splitPdfConverter: Converter = {
  id: "split-pdf",
  acceptedTypes: ["application/pdf"],

  async convert(input: ConverterInput): Promise<ConverterResult> {
    const file = input.files[0];
    if (!file) {
      throw new Error("No file provided");
    }
    const pdfBytes = await readFile(join(input.jobDir, file.storedName));
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const totalPages = pdfDoc.getPageCount();

    const splitConfig = parseSplitOptions(input.options);

    let pageGroups: number[][] = [];

    if (splitConfig.mode === "all") {
      pageGroups = Array.from({ length: totalPages }, (_, i) => [i]);
    } else if (splitConfig.mode === "every" && splitConfig.everyN) {
      const n = splitConfig.everyN;
      for (let i = 0; i < totalPages; i += n) {
        const group: number[] = [];
        for (let j = i; j < Math.min(i + n, totalPages); j++) {
          group.push(j);
        }
        pageGroups.push(group);
      }
    } else if (splitConfig.mode === "ranges" && splitConfig.ranges) {
      pageGroups = parseRangeString(splitConfig.ranges, totalPages);
      if (pageGroups.length === 0) {
        pageGroups = Array.from({ length: totalPages }, (_, i) => [i]);
      }
    }

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const baseName = file.originalName.replace(/\.pdf$/i, "");

    for (let i = 0; i < pageGroups.length; i++) {
      input.onProgress?.({
        percent: Math.round(((i + 1) / pageGroups.length) * 90),
        stage: "processing",
        current: i + 1,
        total: pageGroups.length,
        message: `Splitting part ${i + 1} of ${pageGroups.length}`,
      });
      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdfDoc, pageGroups[i]);
      for (const page of copiedPages) {
        newPdf.addPage(page);
      }
      const newPdfBytes = await newPdf.save();
      const fileName = `${baseName}_part_${String(i + 1).padStart(2, "0")}.pdf`;
      zip.file(fileName, newPdfBytes);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const zipFileName = `${baseName}_split.zip`;
    const zipPath = join(input.jobDir, zipFileName);
    await writeFile(zipPath, zipBuffer);

    return {
      outputFileName: zipFileName,
      outputMimeType: "application/zip",
      outputPath: zipPath,
    };
  },
};

export default splitPdfConverter;
