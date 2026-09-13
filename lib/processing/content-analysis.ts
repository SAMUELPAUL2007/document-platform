/**
 * Canonical content analysis types shared across all PDF converters.
 *
 * Consolidates duplicate TextItem/TextLine/TextColumn/PageAnalysis types
 * from PDF converter modules.
 */

// ─── Text item types ─────────────────────────────────────────

/** A single text item extracted from a PDF page */
export interface TextItem {
  /** The text string */
  str: string;
  /** X position in PDF points (from left edge) */
  x: number;
  /** Y position in PDF points (from bottom edge) */
  y: number;
  /** Width in PDF points */
  width: number;
  /** Height in PDF points */
  height: number;
  /** Computed font size in PDF points */
  fontSize: number;
}

/** A cluster of text items on the same visual line */
export interface TextLine {
  /** Items sorted left-to-right */
  items: TextItem[];
  /** Average Y position of items on this line */
  y: number;
  /** Leftmost X position */
  x: number;
  /** Rightmost edge (x + width of last item) */
  width: number;
  /** Concatenated text */
  text: string;
}

/** A detected text column */
export interface TextColumn {
  /** Lines within this column */
  lines: TextLine[];
  /** Left edge of column */
  xMin: number;
  /** Right edge of column */
  xMax: number;
}

/** Full analysis result for a single PDF page */
export interface PageAnalysis {
  /** Raw text items from pdfjs */
  textItems: TextItem[];
  /** Clustered text lines */
  lines: TextLine[];
  /** Detected columns */
  columns: TextColumn[];
  /** Total character count across all lines */
  totalTextLength: number;
  /** Confidence score 0-1 (higher = more text-heavy, better for text mode) */
  confidence: number;
  /** Number of detected columns */
  columnCount: number;
}

// ─── Document profile ────────────────────────────────────────

/** Describes the overall content profile of a PDF document */
export interface DocumentProfile {
  /** Total number of pages */
  numPages: number;
  /** Number of pages classified as text-heavy */
  textPages: number;
  /** Number of pages classified as visual */
  visualPages: number;
  /** Average text items per page */
  avgTextItemsPerPage: number;
  /** Average confidence across all pages */
  avgConfidence: number;
  /** Whether the document is predominantly visual */
  isVisual: boolean;
  /** Whether the document is predominantly text */
  isTextHeavy: boolean;
}

/** Conversion mode selection for a page */
export type PageMode = "text" | "image" | "mixed";

/** Per-page conversion decision */
export interface PageDecision {
  /** 0-based page index */
  pageIndex: number;
  /** Selected conversion mode */
  mode: PageMode;
  /** Analysis result for this page */
  analysis: PageAnalysis;
}
