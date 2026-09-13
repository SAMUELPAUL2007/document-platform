import { readFile, writeFile, unlink } from "fs/promises";
import { join } from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import type { Converter, ConverterInput, ConverterResult } from "../types";
import { parsePageSelection } from "../page-utils";
import { renderPageToImage } from "../render";

function parseScale(value: string | undefined): number {
  if (!value) return 2;
  const num = parseFloat(value);
  if (isNaN(num) || num < 0.5 || num > 4) return 2;
  return num;
}

async function convertPdfToImages(
  input: ConverterInput,
  format: "jpeg" | "png"
): Promise<ConverterResult> {
  const file = input.files[0];
  if (!file) {
    throw new Error("No file provided");
  }
  const rawBytes = await readFile(join(input.jobDir, file.storedName));
  const pdfBytes = new Uint8Array(rawBytes);
  const scale = parseScale(input.options?.scale);

  const pdfDoc = await pdfjsLib.getDocument({
    data: pdfBytes,
    isOffscreenCanvasSupported: false,
    useSystemFonts: true,
  }).promise;
  const totalPages = pdfDoc.numPages;
  const selectedPages = parsePageSelection(input.options?.pages, totalPages);
  if (input.options?.pages && selectedPages.length === 0) {
    throw new Error("No valid pages found in the specified range. Please check the page numbers and try again.");
  }

  const outputFiles: string[] = [];
  const baseName = file.originalName.replace(/\.pdf$/i, "");

  for (let pi = 0; pi < selectedPages.length; pi++) {
    const pageIndex = selectedPages[pi];
    input.onProgress?.({
      percent: Math.round(((pi + 1) / selectedPages.length) * 90),
      stage: "processing",
      current: pi + 1,
      total: selectedPages.length,
      message: `Rendering page ${pageIndex + 1} of ${totalPages}`,
    });
    const { pngBuffer } = await renderPageToImage(pdfDoc, pageIndex, scale);

    const pageNum = String(pageIndex + 1).padStart(3, "0");
    const ext = format === "jpeg" ? "jpg" : "png";
    const outputFileName = `${baseName}_page_${pageNum}.${ext}`;
    const outputPath = join(input.jobDir, outputFileName);

    if (format === "jpeg") {
      const sharp = (await import("sharp")).default;
      const jpegBuffer = await sharp(pngBuffer).jpeg({ quality: 92 }).toBuffer();
      await writeFile(outputPath, jpegBuffer);
    } else {
      await writeFile(outputPath, pngBuffer);
    }

    outputFiles.push(outputFileName);
  }

  if (outputFiles.length === 1) {
    const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
    return {
      outputFileName: outputFiles[0],
      outputMimeType: mimeType,
      outputPath: join(input.jobDir, outputFiles[0]),
    };
  }

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const fileName of outputFiles) {
    const fileBuffer = await readFile(join(input.jobDir, fileName));
    zip.file(fileName, fileBuffer);
  }
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  const zipFileName = `${baseName}_pages.zip`;
  const zipPath = join(input.jobDir, zipFileName);
  await writeFile(zipPath, zipBuffer);

  for (const fileName of outputFiles) {
    await unlink(join(input.jobDir, fileName)).catch(() => {});
  }

  return {
    outputFileName: zipFileName,
    outputMimeType: "application/zip",
    outputPath: zipPath,
  };
}

const pdfToJpgConverter: Converter = {
  id: "pdf-to-jpg",
  acceptedTypes: ["application/pdf"],
  async convert(input: ConverterInput): Promise<ConverterResult> {
    return convertPdfToImages(input, "jpeg");
  },
};

const pdfToPngConverter: Converter = {
  id: "pdf-to-png",
  acceptedTypes: ["application/pdf"],
  async convert(input: ConverterInput): Promise<ConverterResult> {
    return convertPdfToImages(input, "png");
  },
};

export { pdfToJpgConverter, pdfToPngConverter };
export default pdfToJpgConverter;
