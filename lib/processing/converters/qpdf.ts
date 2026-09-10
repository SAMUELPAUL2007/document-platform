import child_process from "child_process";
import { access } from "fs/promises";
import { logger } from "../../logger";

const QPDF_PATHS = [
  "qpdf",
  "C:\\Program Files\\qpdf\\bin\\qpdf.exe",
  "/usr/bin/qpdf",
  "/usr/local/bin/qpdf",
  "/opt/homebrew/bin/qpdf",
];

let cachedPath: string | null | undefined;

export async function findQpdf(): Promise<string | null> {
  if (cachedPath !== undefined) return cachedPath;

  for (const p of QPDF_PATHS) {
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

export interface QpdfResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

export async function encryptPdfWithQpdf(
  inputPath: string,
  outputPath: string,
  userPassword: string,
  ownerPassword: string
): Promise<QpdfResult> {
  const qpdf = await findQpdf();
  if (!qpdf) {
    return {
      success: false,
      error: "qpdf is not installed. Password protection requires qpdf. Please install qpdf to use this feature.",
    };
  }

  return new Promise((resolve) => {
    const args = [
      inputPath,
      "--encrypt",
      userPassword,
      ownerPassword,
      "256",
      "--",
      outputPath,
    ];

    let stderr = "";
    let killed = false;
    const startTime = Date.now();

    logger.info("qpdf_start", { event: "qpdf_encrypt" });

    const proc = child_process.spawn(/* turbopackIgnore: true */ qpdf, args, {
      stdio: ["ignore", "ignore", "pipe"],
      timeout: 60_000,
    });

    const timer = setTimeout(() => {
      killed = true;
      proc.kill("SIGKILL");
    }, 60_000);

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      const duration = Date.now() - startTime;
      const sanitizedErr = err.message.replace(/password|secret|token/gi, "***");
      logger.error("qpdf_error", { event: "qpdf_encrypt", duration, error: sanitizedErr });
      resolve({
        success: false,
        error: `Failed to start qpdf: ${sanitizedErr}`,
      });
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      const duration = Date.now() - startTime;
      if (killed) {
        logger.warn("qpdf_timeout", { event: "qpdf_encrypt", duration });
        resolve({
          success: false,
          error: "qpdf encryption timed out",
        });
        return;
      }
      if (code !== 0) {
        const sanitizedStderr = stderr.replace(/password|secret|token/gi, "***").slice(0, 500);
        logger.error("qpdf_failed", { event: "qpdf_encrypt", duration, exitCode: code, stderr: sanitizedStderr });
        resolve({
          success: false,
          error: "qpdf encryption failed. The PDF may be corrupted.",
        });
        return;
      }
      logger.info("qpdf_complete", { event: "qpdf_encrypt", duration });
      resolve({ success: true, outputPath });
    });
  });
}
