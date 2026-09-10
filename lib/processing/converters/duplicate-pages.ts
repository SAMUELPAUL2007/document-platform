import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { PDFDocument } from "pdf-lib";
import type { Converter, ConverterInput, ConverterResult } from "../types";
import { parsePageSelection } from "../page-utils";

function parseCount(value?: string): number {
  const num = parseInt(value || "2", 10);
  if (isNaN(num) || num < 1 || num > 10) return 2;
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

    const pagesToDuplicate = parsePageSelection(input.options?.pages, totalPages);
    const count = parseCount(input.options?.count);

    const newPdf = await PDFDocument.create();

    for (let i = 0; i < totalPages; i++) {
      input.onProgress?.({
        percent: Math.round(((i + 1) / totalPages) * 90),
        stage: "processing",
        current: i + 1,
        total: totalPages,
        message: `Processing page ${i + 1} of ${totalPages}`,
      });
      const copiedPages = await newPdf.copyPages(srcDoc, [i]);
      newPdf.addPage(copiedPages[0]);

      if (pagesToDuplicate.includes(i)) {
        for (let c = 1; c < count; c++) {
          const dupPages = await newPdf.copyPages(srcDoc, [i]);
          newPdf.addPage(dupPages[0]);
        }
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
