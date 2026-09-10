import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { PDFDocument } from "pdf-lib";
import type { Converter, ConverterInput, ConverterResult } from "../types";
import { parsePageOrder } from "../page-utils";

const reorderPagesConverter: Converter = {
  id: "reorder-pages",
  acceptedTypes: ["application/pdf"],

  async convert(input: ConverterInput): Promise<ConverterResult> {
    const file = input.files[0];
    const pdfBytes = await readFile(join(input.jobDir, file.storedName));
    const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();

    const newOrder = parsePageOrder(input.options?.order, totalPages);

    input.onProgress?.({
      percent: 50,
      stage: "processing",
      message: `Reordering ${newOrder.length} pages`,
    });

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(srcDoc, newOrder);
    for (const page of copiedPages) {
      newPdf.addPage(page);
    }

    const newPdfBytes = await newPdf.save();
    const baseName = file.originalName.replace(/\.pdf$/i, "");
    const outputFileName = `${baseName}_reordered.pdf`;
    const outputPath = join(input.jobDir, outputFileName);
    await writeFile(outputPath, newPdfBytes);

    return {
      outputFileName,
      outputMimeType: "application/pdf",
      outputPath,
    };
  },
};

export default reorderPagesConverter;
