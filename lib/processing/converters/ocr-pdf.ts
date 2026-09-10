import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import type { Converter, ConverterInput, ConverterResult } from "../types";

const ocrPdfConverter: Converter = {
  id: "ocr-pdf",
  acceptedTypes: ["application/pdf"],

  async convert(input: ConverterInput): Promise<ConverterResult> {
    const file = input.files[0];
    if (!file) {
      throw new Error("No file provided");
    }
    const pdfBytes = new Uint8Array(await readFile(join(input.jobDir, file.storedName)));

    const pdfDoc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
    const newPdf = await PDFDocument.create();
    const font = await newPdf.embedFont(StandardFonts.Helvetica);

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      input.onProgress?.({
        percent: Math.round((i / pdfDoc.numPages) * 90),
        stage: "processing",
        current: i,
        total: pdfDoc.numPages,
        message: `Processing page ${i} of ${pdfDoc.numPages}`,
      });
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const textContent = await page.getTextContent();

      const newPage = newPdf.addPage([viewport.width, viewport.height]);

      const fontHeight = 12;
      const lineHeight = 14;

      let currentY = viewport.height - 30;
      let currentLine = "";
      let lastY: number | null = null;

      for (const item of textContent.items) {
        if (!("str" in item)) continue;
        const str = item as { str: string; transform: number[] };

        if (str.str.trim() === "") continue;

        const y = str.transform[5];

        if (lastY !== null && Math.abs(y - lastY) > fontHeight * 0.5) {
          if (currentLine.trim()) {
            newPage.drawText(currentLine.trim(), {
              x: 50,
              y: currentY,
              size: fontHeight,
              font,
              color: rgb(0, 0, 0),
            });
            currentY -= lineHeight;
          }
          currentLine = str.str;
        } else {
          if (str.str && currentLine && !currentLine.endsWith(" ") && !str.str.startsWith(" ")) {
            currentLine += " ";
          }
          currentLine += str.str;
        }
        lastY = y;
      }

      if (currentLine.trim()) {
        newPage.drawText(currentLine.trim(), {
          x: 50,
          y: currentY,
          size: fontHeight,
          font,
          color: rgb(0, 0, 0),
        });
      }
    }

    const ocrPdfBytes = await newPdf.save();
    const baseName = file.originalName.replace(/\.pdf$/i, "");
    const outputFileName = `${baseName}_ocr.pdf`;
    const outputPath = join(input.jobDir, outputFileName);
    await writeFile(outputPath, ocrPdfBytes);

    return {
      outputFileName,
      outputMimeType: "application/pdf",
      outputPath,
    };
  },
};

export default ocrPdfConverter;
