/**
 * Shared PDF page rendering utility.
 *
 * Consolidates the triplicated renderPageToImage function that existed in:
 *   - pdf-to-docx.ts
 *   - pdf-to-pptx.ts
 *   - pdf-to-image.ts
 *
 * All PDF converters that need page images should use this module.
 */

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";

/** Default render scale (2× = good quality at reasonable file size) */
export const DEFAULT_RENDER_SCALE = 2;

export interface RenderedPage {
  /** PNG image buffer of the rendered page */
  pngBuffer: Buffer;
  /** Page width in PDF points (unscaled) */
  widthPt: number;
  /** Page height in PDF points (unscaled) */
  heightPt: number;
}

/**
 * Render a PDF page to a PNG image buffer.
 *
 * @param pdfDoc - pdfjs document proxy
 * @param pageIndex - 0-based page index
 * @param scale - render scale (default 2×)
 * @returns PNG buffer and unscaled page dimensions in PDF points
 */
export async function renderPageToImage(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageIndex: number,
  scale: number = DEFAULT_RENDER_SCALE
): Promise<RenderedPage> {
  const page = await pdfDoc.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale });

  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  await page.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
    canvas: canvas as unknown as HTMLCanvasElement,
  }).promise;

  const pngBuffer = Buffer.from(canvas.toBuffer("image/png"));

  const unscaledViewport = page.getViewport({ scale: 1 });
  return {
    pngBuffer,
    widthPt: unscaledViewport.width,
    heightPt: unscaledViewport.height,
  };
}

/**
 * Extract text lines from a PDF page, clustering items by Y position.
 *
 * @param content - pdfjs text content
 * @param yTolerance - vertical tolerance for clustering into same line (PDF pts)
 * @returns array of text lines sorted top-to-bottom
 */
export function extractTextLines(
  content: Awaited<ReturnType<pdfjsLib.PDFPageProxy["getTextContent"]>>,
  yTolerance: number = 3
): string[] {
  const lines: string[] = [];
  let currentY: number | null = null;
  let currentLine = "";

  for (const item of content.items) {
    if ("str" in item) {
      const y = item.transform[5];
      if (currentY !== null && Math.abs(y - currentY) > yTolerance) {
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
