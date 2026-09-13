import { readFile, writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { convertWithLibreOffice } from "./libreoffice";
import type { Converter, ConverterInput, ConverterResult } from "../types";
import { logger } from "../../logger";
import { validateLibreOfficePdf } from "../validate";

const CONVERSION_TIMEOUT_MS = 120_000;

const docxToPdfConverter: Converter = {
  id: "docx-to-pdf",
  acceptedTypes: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ],

  async convert(input: ConverterInput): Promise<ConverterResult> {
    const file = input.files[0];
    if (!file) {
      throw new Error("No file provided");
    }

    const inputPath = join(input.jobDir, file.storedName);
    const tempDir = join(tmpdir(), `docx-pdf-${Date.now()}-${Math.random().toString(36).slice(2)}`);

    try {
      await mkdir(tempDir, { recursive: true });

      logger.info("docx_to_pdf_start", {
        event: "docx_to_pdf",
        inputFile: file.originalName,
      });

      const result = await convertWithLibreOffice(inputPath, tempDir, "pdf", CONVERSION_TIMEOUT_MS);

      if (!result.success || !result.outputPath) {
        const errorMsg = result.error || "LibreOffice conversion failed";
        logger.error("docx_to_pdf_failed", {
          event: "docx_to_pdf",
          error: errorMsg,
          stderr: result.stderr,
        });
        throw new Error(`Word to PDF conversion failed: ${errorMsg}`);
      }

      const pdfBuffer = await readFile(result.outputPath);

      if (pdfBuffer.length === 0) {
        throw new Error("LibreOffice produced an empty PDF file");
      }

      const baseName = file.originalName.replace(/\.(docx?|doc)$/i, "");
      const outputFileName = `${baseName}.pdf`;
      const outputPath = join(input.jobDir, outputFileName);
      await writeFile(outputPath, pdfBuffer);

      // Validate output
      const validation = await validateLibreOfficePdf(outputPath);
      if (!validation.valid) {
        const errorMsg = validation.issues
          .filter((i) => i.severity === "error")
          .map((i) => i.message)
          .join("; ");
        throw new Error(`Output validation failed: ${errorMsg}`);
      }

      logger.info("docx_to_pdf_complete", {
        event: "docx_to_pdf",
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
      logger.error("docx_to_pdf_error", { event: "docx_to_pdf", error: message });
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

export default docxToPdfConverter;
