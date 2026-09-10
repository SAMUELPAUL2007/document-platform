import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { PDFDocument } from "pdf-lib";
import type { Converter, ConverterInput, ConverterResult } from "../types";

const mergePdfConverter: Converter = {
  id: "merge-pdf",
  acceptedTypes: ["application/pdf"],

  async convert(input: ConverterInput): Promise<ConverterResult> {
    if (input.files.length < 2) {
      throw new Error("At least 2 PDF files are required to merge");
    }

    const mergedPdf = await PDFDocument.create();

    for (let fi = 0; fi < input.files.length; fi++) {
      const file = input.files[fi];
      input.onProgress?.({
        percent: Math.round(((fi + 1) / input.files.length) * 90),
        stage: "processing",
        current: fi + 1,
        total: input.files.length,
        message: `Merging file ${fi + 1} of ${input.files.length}`,
      });
      const pdfBytes = await readFile(join(input.jobDir, file.storedName));
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      for (const page of copiedPages) {
        mergedPdf.addPage(page);
      }
    }

    const pdfBytes = await mergedPdf.save();
    const outputFileName = "merged.pdf";
    const outputPath = join(input.jobDir, outputFileName);
    await writeFile(outputPath, pdfBytes);

    return {
      outputFileName,
      outputMimeType: "application/pdf",
      outputPath,
    };
  },
};

export default mergePdfConverter;
