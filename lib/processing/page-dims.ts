/**
 * Shared page dimension utilities for converter modules.
 *
 * UNIT REFERENCE:
 *   PDF points:  1 inch = 72 pts  (pdfjs viewport units)
 *   CSS pixels:  1 inch = 96 px   (screen pixels)
 *   OOXML EMU:   1 inch = 914,400 EMU  (DOCX/PPTX internal)
 *   OOXML twips: 1 inch = 1,440 twips  (DOCX line spacing, margins)
 *   DXA:         1 inch = 1,440 DXA  (same as twips, used in section props)
 *
 * KEY CONVERSION:
 *   docx library ImageRun.transformation.width is in CSS pixels (96 DPI).
 *   Internally it multiplies by 9525 to get EMU (914400/96 = 9525).
 *
 *   section properties page size is in EMU (12700 per point).
 *
 *   These are DIFFERENT conversion factors. ImageRun and section page size
 *   use different unit systems. The image MUST match the page.
 */

// ─── Constants ────────────────────────────────────────────────

/** 1 PDF point = 1/72 inch */
export const PTS_PER_INCH = 72;

/** 1 inch = 96 CSS pixels (used by docx ImageRun.transformation) */
export const PX_PER_INCH = 96;

/** EMU per inch (OOXML standard) */
export const EMU_PER_INCH = 914_400;

/** EMU per CSS pixel (914400 / 96 = 9525) — used by docx library internally */
export const EMU_PER_PX = 9525;

/** EMU per PDF point (12700 = 914400 / 72) — used by OOXML section page size */
export const EMU_PER_PT = 12700;

/** Twips/DXA per inch (1440) — used for margins, spacing */
export const TWIPS_PER_INCH = 1440;

// ─── PDF points ↔ other units ────────────────────────────────

/** Convert PDF points to CSS pixels (for docx ImageRun.transformation) */
export function ptsToPx(pts: number): number {
  return (pts * PX_PER_INCH) / PTS_PER_INCH; // pts × 96/72 = pts × 1.3333
}

/** Convert CSS pixels to PDF points */
export function pxToPts(px: number): number {
  return (px * PTS_PER_INCH) / PX_PER_INCH;
}

/** Convert PDF points to OOXML EMU (for section page size) */
export function emuFromPts(pts: number): number {
  return Math.round(pts * EMU_PER_PT);
}

/** Convert OOXML EMU to PDF points */
export function ptsFromEmu(emu: number): number {
  return emu / EMU_PER_PT;
}

/** Convert PDF points to twips/DXA (for margins, spacing) */
export function twipsFromPts(pts: number): number {
  return Math.round(pts * (TWIPS_PER_INCH / PTS_PER_INCH));
}

/** Convert inches to OOXML EMU */
export function emuFromInches(inches: number): number {
  return Math.round(inches * EMU_PER_INCH);
}

/** Convert mm to PDF points */
export function mmToPts(mm: number): number {
  return (mm / 25.4) * PTS_PER_INCH;
}

// ─── PDF page dimensions ─────────────────────────────────────

/** Get PDF page dimensions in points from pdfjs page */
export async function getPdfPageSize(
  pdfDoc: {
    getPage(
      pageNum: number
    ): Promise<{ getViewport(opts: { scale: number }): { width: number; height: number } }>;
  },
  pageIndex: number
): Promise<{ widthPt: number; heightPt: number; isLandscape: boolean }> {
  const page = await pdfDoc.getPage(pageIndex + 1);
  const vp = page.getViewport({ scale: 1 });
  return {
    widthPt: vp.width,
    heightPt: vp.height,
    isLandscape: vp.width > vp.height,
  };
}

// ─── Standard page sizes in points ───────────────────────────

export const PAGE_DIMENSIONS = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
  widescreen16: { width: 10 * PTS_PER_INCH, height: 5.625 * PTS_PER_INCH },
  standard43: { width: 10 * PTS_PER_INCH, height: 7.5 * PTS_PER_INCH },
} as const;

export type PageSize = keyof typeof PAGE_DIMENSIONS;

// ─── Image fitting ───────────────────────────────────────────

/** Fit an image into a container while preserving aspect ratio (contain mode) */
export function fitContain(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number
): { w: number; h: number; x: number; y: number } {
  const scale = Math.min(boxW / imgW, boxH / imgH, 1);
  const w = imgW * scale;
  const h = imgH * scale;
  return { w, h, x: (boxW - w) / 2, y: (boxH - h) / 2 };
}

/** Fit an image into a container filling completely (cover mode) */
export function fitCover(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number
): { w: number; h: number; x: number; y: number } {
  const scale = Math.max(boxW / imgW, boxH / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return { w, h, x: (boxW - w) / 2, y: (boxH - h) / 2 };
}

// ─── DOCX-specific helpers ───────────────────────────────────

/**
 * Calculate correct ImageRun.transformation dimensions for a full-page image.
 *
 * ImageRun.transformation expects CSS pixels at 96 DPI.
 * PDF page dimensions are in points (1/72 inch).
 *
 * formula: px = pts × (96/72) = pts × 1.3333
 *
 * The docx library internally converts: EMU = px × 9525
 * This matches the section page size EMU = pts × 12700
 * because: px × 9525 = (pts × 96/72) × 9525 = pts × 12700 ✓
 */
export function docxImageSizeFromPdfPts(
  widthPt: number,
  heightPt: number
): { width: number; height: number } {
  return {
    width: Math.round(ptsToPx(widthPt)),
    height: Math.round(ptsToPx(heightPt)),
  };
}
