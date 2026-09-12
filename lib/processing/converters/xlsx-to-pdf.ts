import { readFile, writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { convertWithLibreOffice } from "./libreoffice";
import type { Converter, ConverterInput, ConverterResult } from "../types";
import { logger } from "../../logger";

const CONVERSION_TIMEOUT_MS = 120_000;

const xlsxToPdfConverter: Converter = {
  id: "xlsx-to-pdf",
  acceptedTypes: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ],

  async convert(input: ConverterInput): Promise<ConverterResult> {
    const file = input.files[0];
    if (!file) {
      throw new Error("No file provided");
    }

    const inputPath = join(input.jobDir, file.storedName);
    const tempDir = join(tmpdir(), `xlsx-pdf-${Date.now()}-${Math.random().toString(36).slice(2)}`);

    try {
      await mkdir(tempDir, { recursive: true });

      logger.info("xlsx_to_pdf_start", {
        event: "xlsx_to_pdf",
        inputFile: file.originalName,
      });

      const result = await convertWithLibreOffice(inputPath, tempDir, "pdf", CONVERSION_TIMEOUT_MS);

      if (!result.success || !result.outputPath) {
        const errorMsg = result.error || "LibreOffice conversion failed";
        logger.error("xlsx_to_pdf_failed", {
          event: "xlsx_to_pdf",
          error: errorMsg,
          stderr: result.stderr,
        });
        throw new Error(`Excel to PDF conversion failed: ${errorMsg}`);
      }

      const pdfBuffer = await readFile(result.outputPath);

      if (pdfBuffer.length === 0) {
        throw new Error("LibreOffice produced an empty PDF file");
      }

      const baseName = file.originalName.replace(/\.(xlsx?|xls)$/i, "");
      const outputFileName = `${baseName}.pdf`;
      const outputPath = join(input.jobDir, outputFileName);
      await writeFile(outputPath, pdfBuffer);

      logger.info("xlsx_to_pdf_complete", {
        event: "xlsx_to_pdf",
        inputSize: (await readFile(inputPath)).length,
        outputSize: pdfBuffer.length,
      });

      return {
        outputFileName,
        outputMimeType: "application/pdf",
        outputPath,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("xlsx_to_pdf_error", { event: "xlsx_to_pdf", error: message });
      throw error;
    } finally {
      try {
        const files = await import("fs/promises").then((m) => m.readdir(tempDir, { withFileTypes: true }));
        for (const f of files) {
          await unlink(join(tempDir, f.name)).catch(() => {});
        }
        await import("fs/promises").then((m) => m.rmdir(tempDir)).catch(() => {});
      } catch {
        // Best effort cleanup
      }
    }
  },
};

export default xlsxToPdfConverter;
