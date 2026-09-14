import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { Document, Packer, Paragraph, ImageRun, PageOrientation } from "docx";
import type { Converter, ConverterInput, ConverterResult } from "../types";
import { logger } from "../../logger";
import { getPdfPageSize, twipsFromPts, docxImageSizeFromPdfPts } from "../page-dims";
import { renderPageToImage } from "../render";

// ─── Render scale ─────────────────────────────────────────────
// 1.5× saves ~24% render time vs 2× with very good visual quality.
const IMAGE_RENDER_SCALE = 1.5;

// ─── Build a DOCX section from a full-page PNG image ──────────

function buildImageSection(
  pngBuffer: Buffer,
  widthPt: number,
  heightPt: number,
  isLandscape: boolean
) {
  const imgSize = docxImageSizeFromPdfPts(widthPt, heightPt);

  return {
    properties: {
      page: {
        size: {
          // The docx library swaps width/height in OOXML when orientation=LANDSCAPE:
          //   w:w = heightTwips, w:h = widthTwips
          // To get correct physical page (w:w=longer, w:h=shorter for landscape):
          //   pass shorter dim as width, longer dim as height.
          // For portrait: pass normally (no library swap).
          width: isLandscape
            ? twipsFromPts(heightPt)
            : twipsFromPts(widthPt),
          height: isLandscape
            ? twipsFromPts(widthPt)
            : twipsFromPts(heightPt),
          orientation: isLandscape
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
    children: [
      new Paragraph({
        children: [
          new ImageRun({
            data: pngBuffer,
            transformation: imgSize,
            type: "png",
          }),
        ],
      }),
    ],
  };
}

// ─── Image-mode conversion ─────────────────────────────────────

async function convertViaImageMode(
  input: ConverterInput,
  file: NonNullable<ConverterInput["files"][0]>
): Promise<ConverterResult> {
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

  for (let pi = 0; pi < numPages; pi++) {
    input.onProgress?.({
      percent: Math.round(((pi + 1) / numPages) * 90),
      stage: "processing",
      current: pi + 1,
      total: numPages,
      message: `Converting page ${pi + 1} of ${numPages} to DOCX (image mode)`,
    });

    const pageDim = await getPdfPageSize(pdfDoc, pi);

    let sectionChildren: Paragraph[];
    try {
      const rendered = await renderPageToImage(pdfDoc, pi, IMAGE_RENDER_SCALE);
      const section = buildImageSection(
        rendered.pngBuffer,
        rendered.widthPt,
        rendered.heightPt,
        pageDim.isLandscape
      );
      sections.push(section);
      sectionChildren = section.children;
    } catch (err) {
      logger.warn("pdf_to_docx_render_fallback", {
        event: "pdf_to_docx",
        page: pi + 1,
        error: err instanceof Error ? err.message : String(err),
      });
      sectionChildren = [
        new Paragraph({
          children: [],
        }),
      ];
      sections.push({
        properties: {
          page: {
            size: {
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
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
          },
        },
        children: sectionChildren,
      });
    }
  }

  if (sections.length === 0) {
    sections.push({
      properties: {},
      children: [new Paragraph({ children: [] })],
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
    mode: "image",
    inputSize: pdfBytes.length,
    outputSize,
    pages: numPages,
    imageModePages: numPages,
    firstPageWidthPt: (await getPdfPageSize(pdfDoc, 0)).widthPt,
    firstPageHeightPt: (await getPdfPageSize(pdfDoc, 0)).heightPt,
  });

  return {
    outputFileName,
    outputMimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    outputPath,
  };
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

    input.onProgress?.({
      percent: 5,
      stage: "processing",
      current: 0,
      total: 1,
      message: "Starting PDF to Word conversion",
    });

    return convertViaImageMode(input, file);
  },
};

export default pdfToDocxConverter;
