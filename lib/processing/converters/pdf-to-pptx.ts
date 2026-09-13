import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import PptxGenJS from "pptxgenjs";
import type { Converter, ConverterInput, ConverterResult } from "../types";
import { logger } from "../../logger";
import { getPdfPageSize, fitContain, PTS_PER_INCH } from "../page-dims";
import { renderPageToImage, extractTextLines } from "../render";

const RENDER_SCALE = 2;

const pdfToPptxConverter: Converter = {
  id: "pdf-to-pptx",
  acceptedTypes: ["application/pdf"],

  async convert(input: ConverterInput): Promise<ConverterResult> {
    const file = input.files[0];
    if (!file) {
      throw new Error("No file provided");
    }

    logger.info("pdf_to_pptx_start", {
      event: "pdf_to_pptx",
      inputFile: file.originalName,
    });

    const pdfBytes = await readFile(join(input.jobDir, file.storedName));

    const pdfDoc = await pdfjsLib.getDocument({
      data: new Uint8Array(pdfBytes),
      isOffscreenCanvasSupported: false,
      useSystemFonts: true,
    }).promise;
    const numPages = pdfDoc.numPages;

    const pptx = new PptxGenJS();
    pptx.author = "Docvanta";
    pptx.subject = file.originalName.replace(/\.pdf$/i, "");

    const firstDim = await getPdfPageSize(pdfDoc, 0);
    const slideWidthIn = firstDim.widthPt / PTS_PER_INCH;
    const slideHeightIn = firstDim.heightPt / PTS_PER_INCH;
    pptx.defineLayout({ name: "PDF_PAGE", width: slideWidthIn, height: slideHeightIn });
    pptx.layout = "PDF_PAGE";

    for (let pi = 0; pi < numPages; pi++) {
      input.onProgress?.({
        percent: Math.round(((pi + 1) / numPages) * 90),
        stage: "processing",
        current: pi + 1,
        total: numPages,
        message: `Rendering slide ${pi + 1} of ${numPages}`,
      });

      const slide = pptx.addSlide();
      const pageDim = await getPdfPageSize(pdfDoc, pi);

      const pageSlideW = pageDim.widthPt / PTS_PER_INCH;
      const pageSlideH = pageDim.heightPt / PTS_PER_INCH;

      try {
        const rendered = await renderPageToImage(pdfDoc, pi, RENDER_SCALE);

        const imgW = rendered.widthPt / PTS_PER_INCH;
        const imgH = rendered.heightPt / PTS_PER_INCH;

        const fit = fitContain(imgW, imgH, pageSlideW, pageSlideH);

        slide.addImage({
          data: `image/png;base64,${rendered.pngBuffer.toString("base64")}`,
          x: fit.x,
          y: fit.y,
          w: fit.w,
          h: fit.h,
        });
      } catch (err) {
        logger.warn("pdf_to_pptx_render_fallback", {
          event: "pdf_to_pptx",
          page: pi + 1,
          error: err instanceof Error ? err.message : String(err),
        });

        slide.addText(`Page ${pi + 1}`, {
          x: 0.5,
          y: 0.5,
          w: pageSlideW - 1,
          h: 1,
          fontSize: 24,
          color: "333333",
        });

        try {
          const page = await pdfDoc.getPage(pi + 1);
          const textContent = await page.getTextContent();
          const lines = extractTextLines(textContent);
          const textContentStr = lines.join("\n");
          if (textContentStr) {
            slide.addText(textContentStr, {
              x: 0.5,
              y: 1.5,
              w: pageSlideW - 1,
              h: pageSlideH - 2,
              fontSize: 12,
              color: "666666",
            });
          }
        } catch {
          // text extraction also failed — slide stays with just the title
        }
      }
    }

    const result = await pptx.write({ outputType: "nodebuffer" });
    const buffer = Buffer.isBuffer(result) ? result : Buffer.from(result as ArrayBuffer);
    const baseName = file.originalName.replace(/\.pdf$/i, "");
    const outputFileName = `${baseName}.pptx`;
    const outputPath = join(input.jobDir, outputFileName);
    await writeFile(outputPath, buffer);

    logger.info("pdf_to_pptx_complete", {
      event: "pdf_to_pptx",
      inputSize: pdfBytes.length,
      outputSize: buffer.length,
      pages: numPages,
      slideWidthIn,
      slideHeightIn,
    });

    return {
      outputFileName,
      outputMimeType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      outputPath,
    };
  },
};

export default pdfToPptxConverter;
