import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { PDFDocument, RotationTypes } from "pdf-lib";
import type { Converter, ConverterInput, ConverterResult } from "../types";
import { parsePageSelection } from "../page-utils";

function parseRotation(value?: string): 0 | 90 | 180 | 270 {
  const num = parseInt(value || "90", 10);
  if (num === 0) return 0;
  if (num === 90) return 90;
  if (num === 180) return 180;
  if (num === 270) return 270;
  throw new Error(`Invalid rotation angle: ${value}. Supported angles are 0, 90, 180, and 270 degrees.`);
}

const rotatePagesConverter: Converter = {
  id: "rotate-pages",
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
    const rotation = parseRotation(input.options?.rotation);

    for (let pi = 0; pi < selectedPages.length; pi++) {
      const pageIndex = selectedPages[pi];
      input.onProgress?.({
        percent: Math.round(((pi + 1) / selectedPages.length) * 90),
        stage: "processing",
        current: pi + 1,
        total: selectedPages.length,
        message: `Rotating page ${pageIndex + 1}`,
      });
      const page = pdfDoc.getPage(pageIndex);
      const currentRotation = page.getRotation().angle;
      page.setRotation({ angle: (currentRotation + rotation) % 360, type: RotationTypes.Degrees });
    }

    const newPdfBytes = await pdfDoc.save();
    const baseName = file.originalName.replace(/\.pdf$/i, "");
    const outputFileName = `${baseName}_rotated.pdf`;
    const outputPath = join(input.jobDir, outputFileName);
    await writeFile(outputPath, newPdfBytes);

    return {
      outputFileName,
      outputMimeType: "application/pdf",
      outputPath,
    };
  },
};

export default rotatePagesConverter;
