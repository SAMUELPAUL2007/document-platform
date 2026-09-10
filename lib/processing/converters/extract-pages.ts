import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { PDFDocument } from "pdf-lib";
import type { Converter, ConverterInput, ConverterResult } from "../types";
import { parsePageSelection } from "../page-utils";

const extractPagesConverter: Converter = {
  id: "extract-pages",
  acceptedTypes: ["application/pdf"],

  async convert(input: ConverterInput): Promise<ConverterResult> {
    const file = input.files[0];
    const pdfBytes = await readFile(join(input.jobDir, file.storedName));
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const totalPages = pdfDoc.getPageCount();

    const selectedPages = parsePageSelection(input.options?.pages, totalPages);
    if (input.options?.pages && selectedPages.length === 0) {
      throw new Error("No valid pages found in the specified range. Please check the page numbers and try again.");
    }

    input.onProgress?.({
      percent: 50,
      stage: "processing",
      message: `Extracting ${selectedPages.length} pages`,
    });

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(pdfDoc, selectedPages);
    for (const page of copiedPages) {
      newPdf.addPage(page);
    }

    const newPdfBytes = await newPdf.save();
    const baseName = file.originalName.replace(/\.pdf$/i, "");
    const outputFileName = `${baseName}_extracted.pdf`;
    const outputPath = join(input.jobDir, outputFileName);
    await writeFile(outputPath, newPdfBytes);

    return {
      outputFileName,
      outputMimeType: "application/pdf",
      outputPath,
    };
  },
};

export default extractPagesConverter;
