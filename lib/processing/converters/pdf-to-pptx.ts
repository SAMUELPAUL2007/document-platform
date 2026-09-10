import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";
import PptxGenJS from "pptxgenjs";
import type { Converter, ConverterInput, ConverterResult } from "../types";

const SLIDE_WIDTH = 10;
const SLIDE_HEIGHT = 7.5;

async function renderPdfPageToImage(
  pdfBytes: Uint8Array,
  pageNumber: number,
  scale: number = 1.5
): Promise<Buffer> {
  const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext("2d");

  await page.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
    canvas: canvas as unknown as HTMLCanvasElement,
  }).promise;

  return Buffer.from(canvas.toBuffer("image/png"));
}

async function extractTextFromPage(
  pdfBytes: Uint8Array,
  pageNumber: number
): Promise<string[]> {
  const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const page = await pdf.getPage(pageNumber);
  const content = await page.getTextContent();

  const lines: string[] = [];
  let currentY: number | null = null;
  let currentLine = "";

  for (const item of content.items) {
    if ("str" in item) {
      const y = item.transform[5];
      if (currentY !== null && Math.abs(y - currentY) > 2) {
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = "";
      }
      if (item.str && currentLine && !currentLine.endsWith(" ") && !item.str.startsWith(" ")) {
        currentLine += " ";
      }
      currentLine += item.str;
      currentY = y;
    }
  }
  if (currentLine.trim()) lines.push(currentLine.trim());

  return lines;
}

const pdfToPptxConverter: Converter = {
  id: "pdf-to-pptx",
  acceptedTypes: ["application/pdf"],

  async convert(input: ConverterInput): Promise<ConverterResult> {
    const file = input.files[0];
    if (!file) {
      throw new Error("No file provided");
    }
    const pdfBytes = await readFile(join(input.jobDir, file.storedName));

    const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes.buffer.slice(0)) }).promise;
    const numPages = pdfDoc.numPages;

    const pptx = new PptxGenJS();
    pptx.author = "DocFlow";
    pptx.subject = file.originalName.replace(/\.pdf$/i, "");

    for (let i = 1; i <= numPages; i++) {
      input.onProgress?.({
        percent: Math.round((i / numPages) * 90),
        stage: "processing",
        current: i,
        total: numPages,
        message: `Rendering slide ${i} of ${numPages}`,
      });
      const slide = pptx.addSlide();

      try {
        const pageBytes = new Uint8Array(pdfBytes.buffer.slice(0));
        const imgBuffer = await renderPdfPageToImage(pageBytes, i, 1.5);
        const imgBase64 = imgBuffer.toString("base64");

        slide.addImage({
          data: `image/png;base64,${imgBase64}`,
          x: 0,
          y: 0,
          w: SLIDE_WIDTH,
          h: SLIDE_HEIGHT,
        });
      } catch {
        slide.addText(`Page ${i}`, {
          x: 0.5,
          y: 0.5,
          w: SLIDE_WIDTH - 1,
          h: 1,
          fontSize: 24,
          color: "333333",
        });

        const pageBytes = new Uint8Array(pdfBytes.buffer.slice(0));
        const lines = await extractTextFromPage(pageBytes, i);
        const textContent = lines.join("\n");
        if (textContent) {
          slide.addText(textContent, {
            x: 0.5,
            y: 1.5,
            w: SLIDE_WIDTH - 1,
            h: SLIDE_HEIGHT - 2,
            fontSize: 12,
            color: "666666",
          });
        }
      }
    }

    const result = await pptx.write({ outputType: "nodebuffer" });
    const buffer = Buffer.isBuffer(result) ? result : Buffer.from(result as ArrayBuffer);
    const baseName = file.originalName.replace(/\.pdf$/i, "");
    const outputFileName = `${baseName}.pptx`;
    const outputPath = join(input.jobDir, outputFileName);
    await writeFile(outputPath, buffer);

    return {
      outputFileName,
      outputMimeType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      outputPath,
    };
  },
};

export default pdfToPptxConverter;
