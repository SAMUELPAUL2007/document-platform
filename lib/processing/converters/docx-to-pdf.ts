import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import mammoth from "mammoth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Converter, ConverterInput, ConverterResult } from "../types";

const FONT_SIZE = 11;
const LINE_HEIGHT = 14;
const PAGE_MARGIN = 50;
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

function parseHtmlToLines(html: string): string[] {
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

  return text.split("\n").filter((line) => line.trim().length > 0);
}

const docxToPdfConverter: Converter = {
  id: "docx-to-pdf",
  acceptedTypes: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ],

  async convert(input: ConverterInput): Promise<ConverterResult> {
    const file = input.files[0];
    if (!file) {
      throw new Error("No file provided");
    }
    const buffer = await readFile(join(input.jobDir, file.storedName));

    const result = await mammoth.convertToHtml({ buffer });
    const html = result.value;

    const lines = parseHtmlToLines(html);
    if (lines.length === 0) {
      lines.push("(Empty document)");
    }

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const usableWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
    const usableHeight = PAGE_HEIGHT - PAGE_MARGIN * 2;
    const maxLinesPerPage = Math.floor(usableHeight / LINE_HEIGHT);

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - PAGE_MARGIN;
    let lineCount = 0;

    for (const line of lines) {
      if (lineCount >= maxLinesPerPage) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - PAGE_MARGIN;
        lineCount = 0;
      }

      const words = line.split(/\s+/);
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = font.widthOfTextAtSize(testLine, FONT_SIZE);

        if (textWidth > usableWidth && currentLine) {
          page.drawText(currentLine, {
            x: PAGE_MARGIN,
            y,
            size: FONT_SIZE,
            font,
            color: rgb(0, 0, 0),
          });
          y -= LINE_HEIGHT;
          lineCount++;
          currentLine = word;

          if (lineCount >= maxLinesPerPage) {
            page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            y = PAGE_HEIGHT - PAGE_MARGIN;
            lineCount = 0;
          }
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        page.drawText(currentLine, {
          x: PAGE_MARGIN,
          y,
          size: FONT_SIZE,
          font,
          color: rgb(0, 0, 0),
        });
        y -= LINE_HEIGHT;
        lineCount++;
      }
    }

    const pdfBytes = await pdfDoc.save();
    const baseName = file.originalName.replace(/\.(docx?|doc)$/i, "");
    const outputFileName = `${baseName}.pdf`;
    const outputPath = join(input.jobDir, outputFileName);
    await writeFile(outputPath, pdfBytes);

    return {
      outputFileName,
      outputMimeType: "application/pdf",
      outputPath,
    };
  },
};

export default docxToPdfConverter;
