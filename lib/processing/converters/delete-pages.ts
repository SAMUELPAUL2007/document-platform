import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { PDFDocument } from "pdf-lib";
import type { Converter, ConverterInput, ConverterResult } from "../types";
import { parsePageSelection } from "../page-utils";

const deletePagesConverter: Converter = {
  id: "delete-pages",
  acceptedTypes: ["application/pdf"],

  async convert(input: ConverterInput): Promise<ConverterResult> {
    const file = input.files[0];
    const pdfBytes = await readFile(join(input.jobDir, file.storedName));
    const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();

    const pagesToDelete = parsePageSelection(input.options?.pages, totalPages);
    if (!input.options?.pages || input.options.pages.trim() === "") {
      throw new Error("No pages specified for deletion. Please enter the page numbers you want to remove.");
    }
    if (pagesToDelete.length === 0) {
      throw new Error("No valid pages found in the specified range. Please check the page numbers and try again.");
    }

    const pagesToKeep = Array.from({ length: totalPages }, (_, i) => i)
      .filter((i) => !pagesToDelete.includes(i));

    input.onProgress?.({
      percent: 50,
      stage: "processing",
      message: `Keeping ${pagesToKeep.length} of ${totalPages} pages`,
    });

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(srcDoc, pagesToKeep);
    for (const page of copiedPages) {
      newPdf.addPage(page);
    }

    const newPdfBytes = await newPdf.save();
    const baseName = file.originalName.replace(/\.pdf$/i, "");
    const outputFileName = `${baseName}_edited.pdf`;
    const outputPath = join(input.jobDir, outputFileName);
    await writeFile(outputPath, newPdfBytes);

    return {
      outputFileName,
      outputMimeType: "application/pdf",
      outputPath,
    };
  },
};

export default deletePagesConverter;
