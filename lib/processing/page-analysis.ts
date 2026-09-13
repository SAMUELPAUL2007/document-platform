/**
 * Shared PDF page analysis engine.
 *
 * Provides text extraction, line clustering, column detection, and
 * confidence scoring used by all PDF→* converters.
 *
 * Consolidates duplicated logic from PDF converter modules.
 */

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import type {
  TextItem,
  TextLine,
  TextColumn,
  PageAnalysis,
  PageDecision,
  PageMode,
  DocumentProfile,
} from "./content-analysis";

// ─── Constants ────────────────────────────────────────────────

/** Minimum total extracted text length to consider a page "text-heavy" */
const MIN_TEXT_LENGTH = 80;

/** Vertical tolerance for clustering text items into the same line (PDF pts) */
const LINE_Y_TOLERANCE = 4;

/** Vertical tolerance for table row detection (PDF pts) */
const TABLE_ROW_Y_TOLERANCE = 5;

/** Minimum horizontal gap (PDF pts) between columns to detect multi-column */
const COLUMN_GAP_MIN = 20;

/** Fraction of page width that must be empty gap to consider columns */
const COLUMN_GAP_FRACTION = 0.05;

/** Confidence threshold: above this → text mode, below → image mode */
const TEXT_MODE_CONFIDENCE = 0.5;

// ─── Text extraction ──────────────────────────────────────────

/**
 * Extract text items from a pdfjs text content object.
 * Filters out empty/whitespace-only items and computes font size.
 */
export function extractTextItems(
  content: Awaited<ReturnType<pdfjsLib.PDFPageProxy["getTextContent"]>>
): TextItem[] {
  const items: TextItem[] = [];
  for (const item of content.items) {
    if ("str" in item && item.str.trim()) {
      const tx = item.transform;
      const fontSize = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]) || 12;
      items.push({
        str: item.str,
        x: tx[4],
        y: tx[5],
        width: item.width ?? item.str.length * fontSize * 0.6,
        height: item.height ?? fontSize,
        fontSize,
      });
    }
  }
  return items;
}

// ─── Line clustering ──────────────────────────────────────────

/**
 * Cluster text items into lines based on Y proximity.
 * Items with Y positions within tolerance are grouped together.
 * Lines are sorted top-to-bottom (PDF Y is from bottom).
 */
export function clusterIntoLines(
  items: TextItem[],
  yTolerance: number = LINE_Y_TOLERANCE
): TextLine[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => b.y - a.y);

  const lines: TextLine[] = [];
  let currentLine: TextItem[] = [sorted[0]];
  let currentY = sorted[0].y;

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    if (Math.abs(item.y - currentY) <= yTolerance) {
      currentLine.push(item);
    } else {
      lines.push(finalizeLine(currentLine));
      currentLine = [item];
      currentY = item.y;
    }
  }

  lines.push(finalizeLine(currentLine));
  return lines;
}

function finalizeLine(items: TextItem[]): TextLine {
  items.sort((a, b) => a.x - b.x);
  const avgY = items.reduce((s, it) => s + it.y, 0) / items.length;
  return {
    items,
    y: avgY,
    x: items[0].x,
    width: items[items.length - 1].x + items[items.length - 1].width - items[0].x,
    text: items
      .map((it) => it.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim(),
  };
}

// ─── Column detection ─────────────────────────────────────────

/**
 * Detect if the page has a multi-column layout.
 * Returns array of columns, each containing lines sorted top-to-bottom.
 */
export function detectColumns(
  lines: TextLine[],
  pageWidthPt: number
): TextColumn[] {
  if (lines.length < 3) {
    return [{ lines, xMin: 0, xMax: pageWidthPt }];
  }

  const pageThird = pageWidthPt / 3;
  const leftThird = pageThird;
  const rightThird = pageThird * 2;

  const leftLines = lines.filter((l) => l.x < leftThird);
  const rightLines = lines.filter((l) => l.x >= rightThird);

  const minLinesForColumn = Math.max(3, lines.length * 0.2);
  if (leftLines.length < minLinesForColumn || rightLines.length < minLinesForColumn) {
    return [{ lines, xMin: 0, xMax: pageWidthPt }];
  }

  const leftMaxX = Math.max(...leftLines.map((l) => l.x + l.width));
  const rightMinX = Math.min(...rightLines.map((l) => l.x));
  const gap = rightMinX - leftMaxX;

  if (gap < COLUMN_GAP_MIN || gap < pageWidthPt * COLUMN_GAP_FRACTION) {
    return [{ lines, xMin: 0, xMax: pageWidthPt }];
  }

  return [
    { lines: [...leftLines].sort((a, b) => b.y - a.y), xMin: 0, xMax: leftMaxX },
    { lines: [...rightLines].sort((a, b) => b.y - a.y), xMin: rightMinX, xMax: pageWidthPt },
  ];
}

// ─── Confidence scoring ───────────────────────────────────────

/**
 * Calculate confidence score for text-mode conversion.
 * Score 0-1: higher means the page is more text-heavy and suitable for text extraction.
 */
export function calculateConfidence(
  textItems: TextItem[],
  lines: TextLine[],
  totalTextLength: number,
  pageHeightPt: number
): number {
  let confidence = 0;

  // Positive: enough text
  if (totalTextLength >= MIN_TEXT_LENGTH) confidence += 0.3;
  if (totalTextLength >= MIN_TEXT_LENGTH * 3) confidence += 0.1;

  // Positive: reasonable line count
  if (lines.length >= 3) confidence += 0.1;

  // Positive: text items have reasonable sizes
  if (textItems.length > 0) {
    const avgFontSize =
      textItems.reduce((s, it) => s + it.fontSize, 0) / textItems.length;
    if (avgFontSize >= 8 && avgFontSize <= 40) confidence += 0.1;
  }

  // Positive: text covers reasonable portion of page
  if (lines.length > 0) {
    const yMin = Math.min(...lines.map((l) => l.y));
    const yMax = Math.max(...lines.map((l) => l.y));
    const verticalCoverage = (yMax - yMin) / pageHeightPt;
    if (verticalCoverage > 0.3) confidence += 0.1;
  }

  // Negative: very little text
  if (totalTextLength < MIN_TEXT_LENGTH / 2) confidence -= 0.3;

  // Negative: very few lines
  if (lines.length < 2) confidence -= 0.2;

  return Math.max(0, Math.min(1, confidence));
}

// ─── Full page analysis ───────────────────────────────────────

/**
 * Analyze a single PDF page to determine its content characteristics.
 */
export function analyzePage(
  textItems: TextItem[],
  pageWidthPt: number,
  pageHeightPt: number
): PageAnalysis {
  const lines = clusterIntoLines(textItems);
  const columns = detectColumns(lines, pageWidthPt);
  const totalTextLength = lines.reduce((sum, l) => sum + l.text.length, 0);
  const confidence = calculateConfidence(textItems, lines, totalTextLength, pageHeightPt);

  return {
    textItems,
    lines,
    columns,
    totalTextLength,
    confidence,
    columnCount: columns.length,
  };
}

// ─── Conversion mode selection ────────────────────────────────

/**
 * Determine the best conversion mode for a page based on analysis.
 */
export function selectPageMode(analysis: PageAnalysis): PageMode {
  if (analysis.confidence >= TEXT_MODE_CONFIDENCE && analysis.totalTextLength >= MIN_TEXT_LENGTH) {
    return "text";
  }
  return "image";
}

/**
 * Analyze all pages and produce conversion decisions.
 */
export async function analyzeDocument(
  pdfDoc: pdfjsLib.PDFDocumentProxy
): Promise<PageDecision[]> {
  const decisions: PageDecision[] = [];

  for (let pi = 0; pi < pdfDoc.numPages; pi++) {
    const page = await pdfDoc.getPage(pi + 1);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const textItems = extractTextItems(textContent);

    const analysis = analyzePage(textItems, viewport.width, viewport.height);
    const mode = selectPageMode(analysis);

    decisions.push({ pageIndex: pi, mode, analysis });
  }

  return decisions;
}

/**
 * Build a document profile from per-page decisions.
 */
export function buildDocumentProfile(decisions: PageDecision[]): DocumentProfile {
  const numPages = decisions.length;
  const textPages = decisions.filter((d) => d.mode === "text").length;
  const visualPages = decisions.filter((d) => d.mode === "image").length;
  const avgTextItemsPerPage =
    numPages > 0
      ? decisions.reduce((s, d) => s + d.analysis.textItems.length, 0) / numPages
      : 0;
  const avgConfidence =
    numPages > 0
      ? decisions.reduce((s, d) => s + d.analysis.confidence, 0) / numPages
      : 0;

  return {
    numPages,
    textPages,
    visualPages,
    avgTextItemsPerPage,
    avgConfidence,
    isVisual: visualPages > numPages * 0.7,
    isTextHeavy: textPages > numPages * 0.7,
  };
}

// ─── Table detection (for XLSX converter) ─────────────────────

/**
 * Detect tabular structure in text items.
 * Returns a 2D string array and a confidence score.
 */
export function detectTable(
  items: TextItem[],
  yThreshold: number = TABLE_ROW_Y_TOLERANCE
): { table: string[][]; confidence: number } {
  if (items.length === 0) return { table: [], confidence: 0 };

  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);

  const rows: TextItem[][] = [];
  let currentRow: TextItem[] = [sorted[0]];
  let currentY = sorted[0].y;

  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i].y - currentY) < yThreshold) {
      currentRow.push(sorted[i]);
    } else {
      currentRow.sort((a, b) => a.x - b.x);
      rows.push(currentRow);
      currentRow = [sorted[i]];
      currentY = sorted[i].y;
    }
  }
  currentRow.sort((a, b) => a.x - b.x);
  rows.push(currentRow);

  const maxCols = Math.max(...rows.map((r) => r.length));
  const minCols = Math.min(...rows.map((r) => r.length));

  const consistency = maxCols > 0 ? minCols / maxCols : 0;
  const hasMultiCol = maxCols >= 2;
  const hasEnoughRows = rows.length >= 3;

  // Confidence formula: max 1.0 for a perfect table
  // consistency: 0-1 (how uniform column counts are)
  // hasMultiCol: +0.3 bonus for multi-column (tables have multiple columns)
  // hasEnoughRows: +0.2 bonus for sufficient rows
  let confidence = consistency;
  if (hasMultiCol) confidence += 0.3;
  if (hasEnoughRows) confidence += 0.2;
  confidence = Math.min(1, confidence);

  const table: string[][] = [];
  for (const row of rows) {
    const tableRow: string[] = [];
    for (let c = 0; c < maxCols; c++) {
      tableRow.push(row[c]?.str || "");
    }
    table.push(tableRow);
  }

  return { table, confidence };
}

// ─── Heading detection (for DOCX converter) ───────────────────

/** Check if a text line is likely a heading */
export function isHeadingLine(line: string): boolean {
  if (line.length < 3 || line.length > 150) return false;
  if (/^[A-Z][A-Z\s]{3,}$/.test(line)) return true;
  if (/^\d+[\.\)]\s/.test(line)) return true;
  if (/^(Chapter|Section|Part|Appendix)\s/i.test(line)) return true;
  if (line.length < 60 && /^[A-Z]/.test(line) && !/[.!?,;:]$/.test(line)) {
    const words = line.split(/\s+/);
    if (words.length >= 2 && words.length <= 12) return true;
  }
  return false;
}

/** Get heading font size in half-points (docx unit) */
export function getHeadingSize(line: string): number {
  if (/^[A-Z][A-Z\s]{3,}$/.test(line)) return 32; // 16pt
  if (/^(Chapter|Section|Part)\s/i.test(line)) return 30; // 15pt
  return 26; // 13pt
}
