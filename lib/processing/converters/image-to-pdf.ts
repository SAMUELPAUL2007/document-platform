import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { readFile } from "fs/promises";
import { join } from "path";
import type { Converter, ConverterInput, ConverterResult } from "../types";
import { PAGE_DIMENSIONS } from "../page-dims";
import { fitContain } from "../page-dims";

const MAX_DIMENSION = 4096;

type PageSizeKey = keyof typeof PAGE_DIMENSIONS | "original";
type FitMode = "contain" | "cover" | "fill";

function parsePageSize(value?: string): PageSizeKey {
  if (!value) return "a4";
  const lower = value.toLowerCase();
  if (lower === "letter") return "letter";
  if (lower === "original") return "original";
  return "a4";
}

function parseFitMode(value?: string): FitMode {
  if (!value) return "contain";
  const lower = value.toLowerCase();
  if (lower === "cover" || lower === "fill") return lower;
  return "contain";
}

function parseMargin(value?: string): number {
  if (!value) return 36;
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 0 || num > 144) return 36;
  return num;
}

function calculatePlacement(
  imgW: number,
  imgH: number,
  pageW: number,
  pageH: number,
  margin: number,
  fit: FitMode
): { x: number; y: number; w: number; h: number } {
  const availableW = pageW - margin * 2;
  const availableH = pageH - margin * 2;

  let result: { w: number; h: number; x: number; y: number };

  if (fit === "fill") {
    result = { w: availableW, h: availableH, x: 0, y: 0 };
  } else if (fit === "cover") {
    const scale = Math.max(availableW / imgW, availableH / imgH);
    const w = imgW * scale;
    const h = imgH * scale;
    result = { w, h, x: (availableW - w) / 2, y: (availableH - h) / 2 };
  } else {
    result = fitContain(imgW, imgH, availableW, availableH);
  }

  return {
    x: margin + result.x,
    y: margin + result.y,
    w: result.w,
    h: result.h,
  };
}

const imageToPdfConverter: Converter = {
  id: "image-to-pdf",
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"],

  async convert(input: ConverterInput): Promise<ConverterResult> {
    const file = input.files[0];
    if (!file) {
      throw new Error("No file provided");
    }
    const { files, options } = input;
    const pageSize = parsePageSize(options?.pageSize);
    const fit = parseFitMode(options?.fit);
    const margin = parseMargin(options?.margin);

    const pdfDoc = await PDFDocument.create();

    for (let fi = 0; fi < files.length; fi++) {
      const file = files[fi];
      input.onProgress?.({
        percent: Math.round(((fi + 1) / files.length) * 90),
        stage: "processing",
        current: fi + 1,
        total: files.length,
        message: `Processing image ${fi + 1} of ${files.length}`,
      });
      const buffer = await readFile(join(input.jobDir, file.storedName));

      const sharpInstance = sharp(buffer);
      const metadata = await sharpInstance.metadata();
      const imgW = metadata.width || 800;
      const imgH = metadata.height || 600;
      const orientation = metadata.orientation || 1;

      let processedBuffer: Buffer;
      const needsResize = imgW > MAX_DIMENSION || imgH > MAX_DIMENSION;

      let pipeline = sharp(buffer);

      if (orientation >= 5 && orientation <= 8) {
        pipeline = pipeline.rotate();
      } else {
        pipeline = pipeline.rotate();
      }

      if (needsResize) {
        pipeline = pipeline.resize({
          width: Math.min(imgW, MAX_DIMENSION),
          height: Math.min(imgH, MAX_DIMENSION),
          fit: "inside",
        });
      }

      processedBuffer = await pipeline.png().toBuffer();

      const processedMeta = await sharp(processedBuffer).metadata();
      const finalW = processedMeta.width || 800;
      const finalH = processedMeta.height || 600;

      let pageW: number;
      let pageH: number;

      if (pageSize === "original") {
        pageW = finalW;
        pageH = finalH;
      } else {
        const dims = PAGE_DIMENSIONS[pageSize];
        pageW = dims.width;
        pageH = dims.height;
      }

      const placement = calculatePlacement(finalW, finalH, pageW, pageH, margin, fit);

      const page = pdfDoc.addPage([pageW, pageH]);
      const img = await pdfDoc.embedPng(processedBuffer);

      page.drawImage(img, {
        x: placement.x,
        y: placement.y,
        width: placement.w,
        height: placement.h,
      });
    }

    const pdfBytes = await pdfDoc.save();

    const baseName = files.length === 1
      ? files[0].originalName.replace(/\.[^.]+$/, "")
      : "converted";

    const outputFileName = `${baseName}.pdf`;
    const { writeFile } = await import("fs/promises");
    const outputPath = join(input.jobDir, outputFileName);
    await writeFile(outputPath, pdfBytes);

    return {
      outputFileName,
      outputMimeType: "application/pdf",
      outputPath,
    };
  },
};

export default imageToPdfConverter;
