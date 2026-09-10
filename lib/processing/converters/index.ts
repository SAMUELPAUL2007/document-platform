import type { Converter } from "../types";
import imageToPdfConverter from "./image-to-pdf";
import { pdfToJpgConverter, pdfToPngConverter } from "./pdf-to-image";
import mergePdfConverter from "./merge-pdf";
import splitPdfConverter from "./split-pdf";
import extractPagesConverter from "./extract-pages";
import rotatePagesConverter from "./rotate-pages";
import deletePagesConverter from "./delete-pages";
import reorderPagesConverter from "./reorder-pages";
import duplicatePagesConverter from "./duplicate-pages";
import docxToPdfConverter from "./docx-to-pdf";
import xlsxToPdfConverter from "./xlsx-to-pdf";
import pptxToPdfConverter from "./pptx-to-pdf";
import pdfToDocxConverter from "./pdf-to-docx";
import pdfToXlsxConverter from "./pdf-to-xlsx";
import pdfToPptxConverter from "./pdf-to-pptx";
import compressPdfConverter from "./compress-pdf";
import ocrPdfConverter from "./ocr-pdf";
import protectPdfConverter from "./protect-pdf";

const converters = new Map<string, Converter>();

const TOOL_TO_CONVERTER: Record<string, string> = {
  "pdf-to-word": "pdf-to-docx",
  "word-to-pdf": "docx-to-pdf",
  "pdf-to-excel": "pdf-to-xlsx",
  "excel-to-pdf": "xlsx-to-pdf",
  "pdf-to-ppt": "pdf-to-pptx",
  "ppt-to-pdf": "pptx-to-pdf",
  "images-to-pdf": "image-to-pdf",
  "rotate-pdf": "rotate-pages",
};

function register(converter: Converter): void {
  converters.set(converter.id, converter);
}

register(imageToPdfConverter);
register(pdfToJpgConverter);
register(pdfToPngConverter);
register(mergePdfConverter);
register(splitPdfConverter);
register(extractPagesConverter);
register(rotatePagesConverter);
register(deletePagesConverter);
register(reorderPagesConverter);
register(duplicatePagesConverter);
register(docxToPdfConverter);
register(xlsxToPdfConverter);
register(pptxToPdfConverter);
register(pdfToDocxConverter);
register(pdfToXlsxConverter);
register(pdfToPptxConverter);
register(compressPdfConverter);
register(ocrPdfConverter);
register(protectPdfConverter);

function resolveToolId(toolId: string): string {
  return TOOL_TO_CONVERTER[toolId] ?? toolId;
}

export function getConverter(toolId: string): Converter | undefined {
  return converters.get(resolveToolId(toolId));
}

export function hasConverter(toolId: string): boolean {
  return converters.has(resolveToolId(toolId));
}

export function listConverters(): string[] {
  return Array.from(converters.keys());
}

export {
  imageToPdfConverter,
  pdfToJpgConverter,
  pdfToPngConverter,
  mergePdfConverter,
  splitPdfConverter,
  extractPagesConverter,
  rotatePagesConverter,
  deletePagesConverter,
  reorderPagesConverter,
  duplicatePagesConverter,
  docxToPdfConverter,
  xlsxToPdfConverter,
  pptxToPdfConverter,
  pdfToDocxConverter,
  pdfToXlsxConverter,
  pdfToPptxConverter,
  compressPdfConverter,
  ocrPdfConverter,
  protectPdfConverter,
};
