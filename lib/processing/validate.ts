/**
 * Output quality gate — shared validation for all converter outputs.
 *
 * Every converter runs its output through this gate before returning.
 * Catches silent failures: empty files, wrong magic bytes, missing pages.
 */

import { readFile } from "fs/promises";
import { logger } from "../logger";

export interface ValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  outputMimeType: string;
  outputSize: number;
}

/** PDF magic bytes: %PDF */
const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

/** DOCX magic bytes: PK (ZIP header) */
const ZIP_MAGIC = new Uint8Array([0x50, 0x4b]);

function magicMatches(buffer: Uint8Array, magic: Uint8Array): boolean {
  if (buffer.length < magic.length) return false;
  for (let i = 0; i < magic.length; i++) {
    if (buffer[i] !== magic[i]) return false;
  }
  return true;
}

/**
 * Validate a converter output file.
 *
 * @param outputPath - path to the output file
 * @param expectedMimeType - expected MIME type
 * @param options - additional validation options
 */
export async function validateOutput(
  outputPath: string,
  expectedMimeType: string,
  options: {
    /** Minimum expected file size in bytes (default: 100) */
    minSize?: number;
    /** For PDFs: minimum expected page count */
    minPages?: number;
    /** For DOCX/XLSX/PPTX: expected to be valid ZIP */
    expectZip?: boolean;
  } = {}
): Promise<ValidationResult> {
  const { minSize = 100, minPages, expectZip } = options;
  const issues: ValidationIssue[] = [];

  let buffer: Uint8Array;
  try {
    const raw = await readFile(outputPath);
    buffer = new Uint8Array(raw);
  } catch (err) {
    return {
      valid: false,
      issues: [{
        severity: "error",
        code: "FILE_READ_ERROR",
        message: `Cannot read output file: ${err instanceof Error ? err.message : String(err)}`,
      }],
      outputMimeType: expectedMimeType,
      outputSize: 0,
    };
  }

  const outputSize = buffer.length;

  // Check file exists and is non-empty
  if (outputSize === 0) {
    issues.push({
      severity: "error",
      code: "EMPTY_FILE",
      message: "Output file is empty (0 bytes)",
    });
    return { valid: false, issues, outputMimeType: expectedMimeType, outputSize };
  }

  if (outputSize < minSize) {
    issues.push({
      severity: "warning",
      code: "SMALL_FILE",
      message: `Output file is suspiciously small: ${outputSize} bytes (expected ≥ ${minSize})`,
    });
  }

  // Validate magic bytes for known formats
  if (expectedMimeType === "application/pdf") {
    if (!magicMatches(buffer, PDF_MAGIC)) {
      issues.push({
        severity: "error",
        code: "WRONG_MAGIC",
        message: "Output file does not start with PDF magic bytes (%PDF)",
      });
    }
  }

  if (
    expectedMimeType.includes("officedocument") ||
    expectedMimeType === "application/zip"
  ) {
    if (expectZip && !magicMatches(buffer, ZIP_MAGIC)) {
      issues.push({
        severity: "error",
        code: "WRONG_MAGIC",
        message: "Output file does not start with ZIP magic bytes (PK)",
      });
    }
  }

  // For PDFs, verify page count
  if (minPages && expectedMimeType === "application/pdf") {
    try {
      const { PDFDocument } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pageCount = pdfDoc.getPageCount();
      if (pageCount < minPages) {
        issues.push({
          severity: "error",
          code: "INSUFFICIENT_PAGES",
          message: `PDF has ${pageCount} pages, expected at least ${minPages}`,
        });
      }
    } catch {
      issues.push({
        severity: "warning",
        code: "PDF_PARSE_FAILED",
        message: "Could not parse output PDF to verify page count",
      });
    }
  }

  const hasErrors = issues.some((i) => i.severity === "error");

  if (hasErrors) {
    logger.error("output_validation_failed", {
      event: "quality_gate",
      outputPath,
      issues: issues.map((i) => `${i.code}: ${i.message}`),
    });
  }

  return {
    valid: !hasErrors,
    issues,
    outputMimeType: expectedMimeType,
    outputSize,
  };
}

/**
 * Validate a LibreOffice-produced PDF specifically.
 * Checks magic bytes, page count, and minimum size.
 */
export async function validateLibreOfficePdf(
  outputPath: string,
  minPages: number = 1
): Promise<ValidationResult> {
  return validateOutput(outputPath, "application/pdf", {
    minSize: 1000,
    minPages,
    expectZip: false,
  });
}

/**
 * Validate an OOXML output (DOCX, XLSX, PPTX).
 */
export async function validateOoxmlOutput(
  outputPath: string,
  expectedMimeType: string
): Promise<ValidationResult> {
  return validateOutput(outputPath, expectedMimeType, {
    minSize: 500,
    expectZip: true,
  });
}
