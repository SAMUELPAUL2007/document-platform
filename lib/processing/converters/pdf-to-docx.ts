import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import type { Converter, ConverterInput, ConverterResult } from "../types";

async function extractTextFromPdf(
  pdfBytes: Uint8Array
): Promise<Array<{ pageNumber: number; lines: string[] }>> {
  const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const pages: Array<{ pageNumber: number; lines: string[] }> = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
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

    pages.push({ pageNumber: i, lines });
  }

  return pages;
}

const pdfToDocxConverter: Converter = {
  id: "pdf-to-docx",
  acceptedTypes: ["application/pdf"],

  async convert(input: ConverterInput): Promise<ConverterResult> {
    const file = input.files[0];
    if (!file) {
      throw new Error("No file provided");
    }
    const pdfBytes = await readFile(join(input.jobDir, file.storedName));

    const pages = await extractTextFromPdf(new Uint8Array(pdfBytes));

    const paragraphs: Paragraph[] = [];

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: file.originalName.replace(/\.pdf$/i, ""),
            bold: true,
            size: 32,
          }),
        ],
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    for (let pi = 0; pi < pages.length; pi++) {
      const page = pages[pi];
      input.onProgress?.({
        percent: Math.round(((pi + 1) / pages.length) * 90),
        stage: "processing",
        current: pi + 1,
        total: pages.length,
        message: `Converting page ${page.pageNumber} to DOCX`,
      });
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `--- Page ${page.pageNumber} ---`,
              italics: true,
              size: 18,
              color: "888888",
            }),
          ],
          spacing: { before: 200, after: 100 },
          alignment: AlignmentType.CENTER,
        })
      );

      for (const line of page.lines) {
        const isTitle = line.length < 80 && /^[A-Z]/.test(line) && !line.includes(".");

        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                size: isTitle ? 28 : 22,
                bold: isTitle,
              }),
            ],
            spacing: { after: isTitle ? 200 : 80 },
          })
        );
      }
    }

    const doc = new Document({
      sections: [{ children: paragraphs }],
    });

    const buffer = await Packer.toBuffer(doc);
    const baseName = file.originalName.replace(/\.pdf$/i, "");
    const outputFileName = `${baseName}.docx`;
    const outputPath = join(input.jobDir, outputFileName);
    await writeFile(outputPath, buffer);

    return {
      outputFileName,
      outputMimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      outputPath,
    };
  },
};

export default pdfToDocxConverter;
