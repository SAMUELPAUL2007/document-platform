// @turbopack-ignore

import { spawn } from "child_process";
import { access } from "fs/promises";
import { logger } from "../../logger";

const LIBREOFFICE_PATHS = [
  "soffice",
  "libreoffice",
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  "/usr/bin/libreoffice",
  "/usr/bin/soffice",
  "/usr/local/bin/libreoffice",
  "/Applications/LibreOffice.app/Contents/MacOS/soffice",
];

import { join } from "path";

const DEFAULT_TIMEOUT_MS = 60_000;

let cachedPath: string | null | undefined;

export async function findLibreOffice(): Promise<string | null> {
  if (cachedPath !== undefined) return cachedPath;

  for (const p of LIBREOFFICE_PATHS) {
    try {
      await access(p);
      cachedPath = p;
      return cachedPath;
    } catch {
      // not found, continue
    }
  }

  cachedPath = null;
  return null;
}

export interface ConvertResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  stderr?: string;
}

export async function convertWithLibreOffice(
  inputPath: string,
  outputDir: string,
  outputFormat: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<ConvertResult> {
  const soffice = await findLibreOffice();
  if (!soffice) {
    return {
      success: false,
      error: "LibreOffice is not installed on this system. Please install LibreOffice to use this feature.",
    };
  }

  return new Promise((resolve) => {
    const args = [
      "--headless",
      "--norestore",
      "--convert-to",
      outputFormat,
      "--outdir",
      outputDir,
      inputPath,
    ];

    let stderr = "";
    let killed = false;
    const startTime = Date.now();

    logger.info("libreoffice_start", { event: "libreoffice_convert", outputFormat });

    const proc = spawn(/* turbopackIgnore: true */ soffice, args, {
      stdio: ["ignore", "ignore", "pipe"],
      timeout: timeoutMs,
    });

    const timer = setTimeout(() => {
      killed = true;
      proc.kill("SIGKILL");
    }, timeoutMs);

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("error", (err: Error) => {
      clearTimeout(timer);
      const duration = Date.now() - startTime;
      const sanitizedErr = err.message.replace(/password|secret|token/gi, "***");
      logger.error("libreoffice_error", { event: "libreoffice_convert", duration, error: sanitizedErr });
      resolve({
        success: false,
        error: `Failed to start LibreOffice: ${sanitizedErr}`,
        stderr,
      });
    });

    proc.on("close", async (code: number) => {
      clearTimeout(timer);
      const duration = Date.now() - startTime;
      if (killed) {
        logger.warn("libreoffice_timeout", { event: "libreoffice_convert", duration });
        resolve({
          success: false,
          error: "LibreOffice conversion timed out",
          stderr,
        });
        return;
      }
      if (code !== 0) {
        const sanitizedStderr = stderr.replace(/password|secret|token/gi, "***").slice(0, 500);
        logger.error("libreoffice_failed", { event: "libreoffice_convert", duration, exitCode: code, stderr: sanitizedStderr });
        resolve({
          success: false,
          error: `LibreOffice conversion failed (exit code ${code})`,
          stderr,
        });
        return;
      }

      // Determine expected output file name based on input
      const baseName = inputPath.split(/[\\/]/).pop() || "output";
      const outFileName = baseName.replace(/\.[^.]+$/, "") + "." + outputFormat;
      let outPath = join(/* turbopackIgnore: true */ outputDir, outFileName);

      // Verify the output file exists; if not, attempt a directory scan for any matching file
      try {
        await access(outPath);
      } catch {
        // Fallback: look for any file in the output directory that matches the expected extension
        const files = await import("fs/promises").then(m => m.readdir(outputDir, { withFileTypes: true }));
        const match = files.find(
          (f) => !f.isDirectory() && f.name.endsWith(`.` + outputFormat)
        );
        if (match) {
          outPath = join(outputDir, match.name);
        } else {
          logger.error("libreoffice_output_missing", { event: "libreoffice_convert", duration });
          resolve({
            success: false,
            error: "LibreOffice conversion completed but output file not found",
            stderr,
          });
          return;
        }
      }

      logger.info("libreoffice_complete", { event: "libreoffice_convert", duration, outputFormat });
      resolve({
        success: true,
        outputPath: outPath,
      });
    });
  });
}
