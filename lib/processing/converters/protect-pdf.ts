import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import { PDFDocument } from "pdf-lib";
import { encryptPdfWithQpdf } from "./qpdf";
import type { Converter, ConverterInput, ConverterResult } from "../types";

const protectPdfConverter: Converter = {
  id: "protect-pdf",
  acceptedTypes: ["application/pdf"],

  async convert(input: ConverterInput): Promise<ConverterResult> {
    const file = input.files[0];
    const password = input.options?.password || "";

    if (!password || password.length < 1) {
      throw new Error("A password is required to protect the PDF");
    }

    if (password.length > 128) {
      throw new Error("Password must be 128 characters or fewer");
    }

    const inputPath = join(input.jobDir, file.storedName);
    const baseName = file.originalName.replace(/\.pdf$/i, "");
    const outputFileName = `${baseName}_protected.pdf`;
    const outputPath = join(input.jobDir, outputFileName);

    const ownerPassword = randomBytes(24).toString("hex");

    const qpdfResult = await encryptPdfWithQpdf(
      inputPath,
      outputPath,
      password,
      ownerPassword
    );

    if (qpdfResult.success) {
      return {
        outputFileName,
        outputMimeType: "application/pdf",
        outputPath,
      };
    }

    throw new Error(
      `Password protection failed: ${qpdfResult.error || "qpdf not available"}. ` +
      `Please install qpdf for PDF password protection support.`
    );
  },
};

export default protectPdfConverter;
