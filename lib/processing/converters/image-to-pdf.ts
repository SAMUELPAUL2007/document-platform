import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { readFile } from "fs/promises";
import { join } from "path";
import type { Converter, ConverterInput, ConverterResult } from "../types";
import { PAGE_SIZES, type PageSize } from "../types";

const MAX_DIMENSION = 4096;

function parsePageSize(value?: string): PageSize {
  if (!value) return "a4";
  const lower = value.toLowerCase();
  if (lower === "letter" || lower === "original") return lower;
  return "a4";
}

function parseFitMode(value?: string): "contain" | "cover" | "fill" {
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
  fit: "contain" | "cover" | "fill"
): { x: number; y: number; w: number; h: number } {
  const availableW = pageW - margin * 2;
  const availableH = pageH - margin * 2;

  let w: number;
  let h: number;

  if (fit === "fill") {
    w = availableW;
    h = availableH;
  } else if (fit === "cover") {
    const scaleX = availableW / imgW;
    const scaleY = availableH / imgH;
    const scale = Math.max(scaleX, scaleY);
    w = imgW * scale;
    h = imgH * scale;
  } else {
    const scaleX = availableW / imgW;
    const scaleY = availableH / imgH;
    const scale = Math.min(scaleX, scaleY, 1);
    w = imgW * scale;
    h = imgH * scale;
  }

  const x = margin + (availableW - w) / 2;
  const y = margin + (availableH - h) / 2;

  return { x, y, w, h };
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

      const metadata = await sharp(buffer).metadata();
      const imgW = metadata.width || 800;
      const imgH = metadata.height || 600;

      let processedBuffer: Buffer;
      const needsResize = imgW > MAX_DIMENSION || imgH > MAX_DIMENSION;

      if (needsResize) {
        processedBuffer = await sharp(buffer)
          .resize({
            width: Math.min(imgW, MAX_DIMENSION),
            height: Math.min(imgH, MAX_DIMENSION),
            fit: "inside",
          })
          .png()
          .toBuffer();
      } else {
        processedBuffer = await sharp(buffer).png().toBuffer();
      }

      const processedMeta = await sharp(processedBuffer).metadata();
      const finalW = processedMeta.width || 800;
      const finalH = processedMeta.height || 600;

      let pageW: number;
      let pageH: number;

      if (pageSize === "original") {
        pageW = finalW;
        pageH = finalH;
      } else {
        const dims = PAGE_SIZES[pageSize]!;
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
