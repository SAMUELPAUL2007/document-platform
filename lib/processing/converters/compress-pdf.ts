import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { PDFDocument } from "pdf-lib";
import type { Converter, ConverterInput, ConverterResult } from "../types";

function parseQualityLevel(value?: string): "low" | "medium" | "high" {
  const level = (value || "medium").toLowerCase();
  if (level === "low" || level === "high") return level;
  return "medium";
}

const QUALITY_SETTINGS = {
  low: { removeMetadata: true, subsetFonts: false, useObjectStreams: true },
  medium: { removeMetadata: true, subsetFonts: true, useObjectStreams: true },
  high: { removeMetadata: false, subsetFonts: true, useObjectStreams: true },
} as const;

const compressPdfConverter: Converter = {
  id: "compress-pdf",
  acceptedTypes: ["application/pdf"],

  async convert(input: ConverterInput): Promise<ConverterResult> {
    const file = input.files[0];
    if (!file) {
      throw new Error("No file provided");
    }
    const pdfBytes = await readFile(join(input.jobDir, file.storedName));
    const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    const quality = parseQualityLevel(input.options?.quality);
    const settings = QUALITY_SETTINGS[quality];

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(srcDoc, srcDoc.getPageIndices());
    for (const page of copiedPages) {
      newPdf.addPage(page);
    }

    if (settings.removeMetadata) {
      newPdf.setTitle("");
      newPdf.setAuthor("");
      newPdf.setSubject("");
      newPdf.setKeywords([]);
      newPdf.setProducer("");
      newPdf.setCreator("");
    }

    const saveOptions: Parameters<typeof newPdf.save>[0] = {
      useObjectStreams: settings.useObjectStreams,
      addDefaultPage: false,
    };

    if (settings.subsetFonts) {
      saveOptions.objectsPerTick = 50;
    }

    const compressedBytes = await newPdf.save(saveOptions);

    const baseName = file.originalName.replace(/\.pdf$/i, "");
    const outputFileName = `${baseName}_compressed.pdf`;
    const outputPath = join(input.jobDir, outputFileName);
    await writeFile(outputPath, compressedBytes);

    return {
      outputFileName,
      outputMimeType: "application/pdf",
      outputPath,
    };
  },
};

export default compressPdfConverter;
