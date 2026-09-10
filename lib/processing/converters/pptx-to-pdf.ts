import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Converter, ConverterInput, ConverterResult } from "../types";

const FONT_SIZE = 14;
const PAGE_MARGIN = 50;

interface SlideContent {
  title: string;
  notes: string[];
}

async function parsePptx(buffer: Buffer): Promise<SlideContent[]> {
  const zip = await JSZip.loadAsync(buffer);
  const slides: SlideContent[] = [];

  const slideFiles = Object.keys(zip.files)
    .filter((f) => f.match(/ppt\/slides\/slide\d+\.xml$/))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || "0", 10);
      const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || "0", 10);
      return numA - numB;
    });

  for (const slideFile of slideFiles) {
    const xml = await zip.file(slideFile)!.async("string");
    const texts: string[] = [];

    const textMatches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
    if (textMatches) {
      for (const match of textMatches) {
        const text = match.replace(/<[^>]+>/g, "").trim();
        if (text) texts.push(text);
      }
    }

    slides.push({
      title: texts[0] || "",
      notes: texts.slice(1),
    });
  }

  return slides;
}

const pptxToPdfConverter: Converter = {
  id: "pptx-to-pdf",
  acceptedTypes: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
  ],

  async convert(input: ConverterInput): Promise<ConverterResult> {
    const file = input.files[0];
    if (!file) {
      throw new Error("No file provided");
    }
    const buffer = await readFile(join(input.jobDir, file.storedName));

    const slides = await parsePptx(buffer);
    if (slides.length === 0) {
      throw new Error("No slides found in the presentation");
    }

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const slideWidth = 720;
    const slideHeight = 540;

    for (const slide of slides) {
      const page = pdfDoc.addPage([slideWidth, slideHeight]);
      let y = slideHeight - PAGE_MARGIN;

      if (slide.title) {
        page.drawText(slide.title, {
          x: PAGE_MARGIN,
          y,
          size: 24,
          font: boldFont,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= 40;
      }

      for (const note of slide.notes) {
        if (y < PAGE_MARGIN + 20) break;

        const words = note.split(/\s+/);
        let currentLine = "";
        const maxLineWidth = slideWidth - PAGE_MARGIN * 2;

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const textWidth = font.widthOfTextAtSize(testLine, FONT_SIZE);

          if (textWidth > maxLineWidth && currentLine) {
            page.drawText(currentLine, {
              x: PAGE_MARGIN,
              y,
              size: FONT_SIZE,
              font,
              color: rgb(0.2, 0.2, 0.2),
            });
            y -= 20;
            currentLine = word;
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
            color: rgb(0.2, 0.2, 0.2),
          });
          y -= 20;
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    const baseName = file.originalName.replace(/\.(pptx?|ppt)$/i, "");
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

export default pptxToPdfConverter;
