import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { PDFDocument } from "pdf-lib";
import type { Converter, ConverterInput, ConverterResult } from "../types";
import { parsePageSelection } from "../page-utils";

function parseCount(value?: string): number {
  const num = parseInt(value || "2", 10);
  if (isNaN(num) || num < 1 || num > 5) return 2;
  return num;
}

const duplicatePagesConverter: Converter = {
  id: "duplicate-pages",
  acceptedTypes: ["application/pdf"],

  async convert(input: ConverterInput): Promise<ConverterResult> {
    const file = input.files[0];
    if (!file) {
      throw new Error("No file provided");
    }
    const pdfBytes = await readFile(join(input.jobDir, file.storedName));
    const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();

    const selectedIndices = parsePageSelection(input.options?.pages, totalPages);
    const count = parseCount(input.options?.count);

    if (selectedIndices.length === 0) {
      throw new Error("No pages selected. Please select at least one page.");
    }

    const newPdf = await PDFDocument.create();
    const outputPageCount = selectedIndices.length * count;

    let processed = 0;
    for (const pageIndex of selectedIndices) {
      for (let c = 0; c < count; c++) {
        input.onProgress?.({
          percent: Math.round(((processed + 1) / outputPageCount) * 90),
          stage: "processing",
          current: processed + 1,
          total: outputPageCount,
          message: `Copying page ${pageIndex + 1} (${c + 1}/${count})`,
        });

        const [copiedPage] = await newPdf.copyPages(srcDoc, [pageIndex]);
        newPdf.addPage(copiedPage);
        processed++;
      }
    }

    const newPdfBytes = await newPdf.save();
    const baseName = file.originalName.replace(/\.pdf$/i, "");
    const outputFileName = `${baseName}_duplicated.pdf`;
    const outputPath = join(input.jobDir, outputFileName);
    await writeFile(outputPath, newPdfBytes);

    return {
      outputFileName,
      outputMimeType: "application/pdf",
      outputPath,
    };
  },
};

export default duplicatePagesConverter;
