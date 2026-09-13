import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  ImageRun,
  PageOrientation,
} from "docx";
import type { Converter, ConverterInput, ConverterResult } from "../types";
import { logger } from "../../logger";
import {
  getPdfPageSize,
  twipsFromPts,
  docxImageSizeFromPdfPts,
} from "../page-dims";
import { renderPageToImage } from "../render";
import {
  extractTextItems,
  analyzePage,
  selectPageMode,
  isHeadingLine,
  getHeadingSize,
} from "../page-analysis";
import type { PageAnalysis } from "../content-analysis";

// ─── Build DOCX children from analysis ────────────────────────

function buildTextContent(analysis: PageAnalysis): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  const allLines: PageAnalysis["lines"][0][] = [];
  for (const col of analysis.columns) {
    allLines.push(...col.lines);
  }

  for (const line of allLines) {
    if (!line.text.trim()) continue;

    const heading = isHeadingLine(line.text);
    const fontSize = heading ? getHeadingSize(line.text) : 22;

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: line.text,
            size: fontSize,
            bold: heading,
          }),
        ],
        spacing: {
          before: heading ? 360 : 60,
          after: heading ? 200 : 40,
          line: 276,
        },
      })
    );
  }

  return paragraphs;
}

function buildImageContent(
  pngBuffer: Buffer,
  widthPt: number,
  heightPt: number
): Paragraph[] {
  const imgSize = docxImageSizeFromPdfPts(widthPt, heightPt);

  return [
    new Paragraph({
      children: [
        new ImageRun({
          data: pngBuffer,
          transformation: imgSize,
          type: "png",
        }),
      ],
    }),
  ];
}

// ─── Main converter ───────────────────────────────────────────

const pdfToDocxConverter: Converter = {
  id: "pdf-to-docx",
  acceptedTypes: ["application/pdf"],

  async convert(input: ConverterInput): Promise<ConverterResult> {
    const file = input.files[0];
    if (!file) {
      throw new Error("No file provided");
    }

    logger.info("pdf_to_docx_start", {
      event: "pdf_to_docx",
      inputFile: file.originalName,
    });

    const rawBytes = await readFile(join(input.jobDir, file.storedName));
    const pdfBytes = new Uint8Array(rawBytes);

    const pdfDoc = await pdfjsLib.getDocument({
      data: pdfBytes,
      isOffscreenCanvasSupported: false,
      useSystemFonts: true,
    }).promise;
    const numPages = pdfDoc.numPages;

    const sections: Array<{
      properties: Record<string, unknown>;
      children: Paragraph[];
    }> = [];

    let textModeCount = 0;
    let imageModeCount = 0;

    for (let pi = 0; pi < numPages; pi++) {
      input.onProgress?.({
        percent: Math.round(((pi + 1) / numPages) * 90),
        stage: "processing",
        current: pi + 1,
        total: numPages,
        message: `Converting page ${pi + 1} of ${numPages} to DOCX`,
      });

      const pageDim = await getPdfPageSize(pdfDoc, pi);
      const page = await pdfDoc.getPage(pi + 1);
      const textContent = await page.getTextContent();
      const textItems = extractTextItems(textContent);

      const analysis = analyzePage(textItems, pageDim.widthPt, pageDim.heightPt);
      const mode = selectPageMode(analysis);

      let sectionChildren: Paragraph[];

      if (mode === "text") {
        sectionChildren = buildTextContent(analysis);
        textModeCount++;
      } else {
        try {
          const rendered = await renderPageToImage(pdfDoc, pi);
          sectionChildren = buildImageContent(
            rendered.pngBuffer,
            rendered.widthPt,
            rendered.heightPt
          );
          imageModeCount++;
        } catch (err) {
          logger.warn("pdf_to_docx_render_fallback", {
            event: "pdf_to_docx",
            page: pi + 1,
            error: err instanceof Error ? err.message : String(err),
          });
          sectionChildren = [
            new Paragraph({
              children: [
                new TextRun({
                  text: `[Page ${pi + 1} — content could not be rendered]`,
                  italics: true,
                  color: "999999",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ];
        }
      }

      sections.push({
        properties: {
          page: {
            size: {
              // The docx library swaps width/height in OOXML when orientation=LANDSCAPE:
              //   w:w = heightTwips, w:h = widthTwips
              // To get correct physical page (w:w=longer, w:h=shorter for landscape):
              //   pass shorter dim as width, longer dim as height.
              // For portrait: pass normally (no library swap).
              width: pageDim.isLandscape
                ? twipsFromPts(pageDim.heightPt)
                : twipsFromPts(pageDim.widthPt),
              height: pageDim.isLandscape
                ? twipsFromPts(pageDim.widthPt)
                : twipsFromPts(pageDim.heightPt),
              orientation: pageDim.isLandscape
                ? PageOrientation.LANDSCAPE
                : PageOrientation.PORTRAIT,
            },
            margin: {
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            },
          },
        },
        children: sectionChildren,
      });
    }

    if (sections.length === 0) {
      sections.push({
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "(No extractable content found in this PDF)",
                italics: true,
                color: "999999",
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      });
    }

    const doc = new Document({
      sections: sections.map((s) => ({
        properties: s.properties,
        children: s.children,
      })),
    });

    const buffer = await Packer.toBuffer(doc);
    const baseName = file.originalName.replace(/\.pdf$/i, "");
    const outputFileName = `${baseName}.docx`;
    const outputPath = join(input.jobDir, outputFileName);
    await writeFile(outputPath, buffer);

    const outputSize = buffer.length;

    logger.info("pdf_to_docx_complete", {
      event: "pdf_to_docx",
      inputSize: pdfBytes.length,
      outputSize,
      pages: numPages,
      textModePages: textModeCount,
      imageModePages: imageModeCount,
      firstPageWidthPt: (await getPdfPageSize(pdfDoc, 0)).widthPt,
      firstPageHeightPt: (await getPdfPageSize(pdfDoc, 0)).heightPt,
    });

    return {
      outputFileName,
      outputMimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      outputPath,
    };
  },
};

export default pdfToDocxConverter;
