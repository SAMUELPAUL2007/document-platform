import { randomUUID } from "crypto";
import { join } from "path";
import type { Job, JobFile, JobState, ConverterInput } from "./types";
import {
  ensureJobDir,
  getJobDir,
  storeFile,
  storeResult,
  readFileFromJob,
  removeJobDir,
} from "./file-store";
import { validateFile, getMimeTypeFromExtension } from "./validators";
import { getConverter } from "./converters";
import { startCleanupScheduler } from "./cleanup";
import { ProgressTracker } from "../progress";
import { getToolById } from "@/lib/tools";
import { MAX_FILE_SIZE, MAX_CONCURRENT_JOBS } from "@/lib/constants";
import { logger } from "@/lib/logger";

const MAX_FILES_PER_JOB = 20;
const MAX_JOBS = 100;
const JOB_TTL_MS = 60 * 60 * 1000;

const VALID_TRANSITIONS: Record<JobState, JobState[]> = {
  QUEUED: ["PROCESSING", "CANCELLED", "FAILED"],
  PROCESSING: ["COMPLETED", "FAILED", "CANCELLED"],
  COMPLETED: ["CLEANED"],
  FAILED: ["CLEANED"],
  CANCELLED: ["CLEANED"],
  CLEANED: [],
};

function canTransition(from: JobState, to: JobState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── HMR-safe global state ──────────────────────────────────
// Attach mutable state to globalThis so it survives Turbopack/webpack HMR.
// When a module is re-evaluated during hot reload, module-scope variables are
// re-initialized. By reading from globalThis first, we keep the existing state.
// This is the standard Next.js pattern for server-side singleton state.

const g = globalThis as unknown as {
  __docvanta_jobs?: Map<string, Job>;
  __docvanta_activeJobs?: number;
  __docvanta_waitingQueue?: Array<() => void>;
  __docvanta_shutdownInitiated?: boolean;
};

const jobs: Map<string, Job> = g.__docvanta_jobs ?? new Map<string, Job>();
g.__docvanta_jobs = jobs;

let activeJobs = g.__docvanta_activeJobs ?? 0;
g.__docvanta_activeJobs = activeJobs;

const waitingQueue: Array<() => void> = g.__docvanta_waitingQueue ?? [];
g.__docvanta_waitingQueue = waitingQueue;

function acquireSlot(): Promise<void> {
  if (activeJobs < MAX_CONCURRENT_JOBS) {
    activeJobs++;
    g.__docvanta_activeJobs = activeJobs;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waitingQueue.push(() => {
      activeJobs++;
      g.__docvanta_activeJobs = activeJobs;
      resolve();
    });
  });
}

function releaseSlot(): void {
  activeJobs--;
  g.__docvanta_activeJobs = activeJobs;
  const next = waitingQueue.shift();
  if (next) next();
}

startCleanupScheduler();

function evictStaleJobs(): void {
  if (jobs.size <= MAX_JOBS) return;
  const now = Date.now();
  const sorted = Array.from(jobs.entries())
    .sort((a, b) => a[1].updatedAt - b[1].updatedAt);
  let evicted = 0;
  for (const [id, job] of sorted) {
    if (jobs.size - evicted <= MAX_JOBS) break;
    if (job.state === "COMPLETED" || job.state === "FAILED" || now - job.updatedAt > JOB_TTL_MS) {
      jobs.delete(id);
      removeJobDir(id).catch(() => {});
      evicted++;
    }
  }
}

function createJob(toolId: string, files: JobFile[], options?: Record<string, string>, jobId?: string): Job {
  const id = jobId || randomUUID();
  const now = Date.now();
  const job: Job = {
    id,
    toolId,
    state: "QUEUED",
    files,
    options,
    createdAt: now,
    updatedAt: now,
  };
  jobs.set(id, job);
  evictStaleJobs();
  return job;
}

function getJob(jobId: string): Job | undefined {
  return jobs.get(jobId);
}

function updateJob(jobId: string, updates: Partial<Job>): Job | undefined {
  const job = jobs.get(jobId);
  if (!job) return undefined;

  if (updates.state && updates.state !== job.state) {
    if (!canTransition(job.state, updates.state)) {
      const { state, ...rest } = updates;
      if (Object.keys(rest).length > 0) {
        const updated = { ...job, ...rest, updatedAt: Date.now() };
        jobs.set(jobId, updated);
        return updated;
      }
      return job;
    }
  }

  const updated = { ...job, ...updates, updatedAt: Date.now() };
  jobs.set(jobId, updated);
  return updated;
}

export async function processUpload(
  toolId: string,
  formData: FormData,
  options?: Record<string, string>
): Promise<{ job: Job; fileInfos: Array<{ id: string; name: string; size: number }> }> {
  const fileEntries: Array<{ file: File; buffer: Buffer }> = [];

  for (const [key, value] of formData.entries()) {
    if (key === "files" && value instanceof File) {
      const buffer = Buffer.from(await value.arrayBuffer());
      fileEntries.push({ file: value, buffer });
    }
  }

  if (fileEntries.length === 0) {
    throw new Error("No files provided");
  }

  const tool = getToolById(toolId);
  const toolMaxFiles = tool?.maxFiles || MAX_FILES_PER_JOB;

  if (fileEntries.length > toolMaxFiles) {
    throw new Error(`Too many files. Maximum ${toolMaxFiles} file${toolMaxFiles === 1 ? "" : "s"} allowed for this tool.`);
  }

  const jobId = randomUUID();
  await ensureJobDir(jobId);

  const acceptList = tool?.accept || "";

  const storedFiles: JobFile[] = [];
  const fileInfos: Array<{ id: string; name: string; size: number }> = [];

  try {
    for (const { file, buffer } of fileEntries) {
      const mimeType = file.type || getMimeTypeFromExtension(file.name) || "application/octet-stream";

      const validation = validateFile(
        file.name,
        mimeType,
        buffer.length,
        buffer,
        acceptList,
        MAX_FILE_SIZE
      );

      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const jobFile = await storeFile(jobId, file.name, mimeType, buffer);
      storedFiles.push(jobFile);
      fileInfos.push({
        id: jobFile.id,
        name: jobFile.originalName,
        size: jobFile.size,
      });
    }
  } catch (error) {
    await removeJobDir(jobId);
    throw error;
  }

  const job = createJob(toolId, storedFiles, options, jobId);

  return { job, fileInfos };
}

function wrapConverterError(error: unknown): string {
  if (!(error instanceof Error)) return "An unexpected error occurred. Please try again.";

  const msg = error.message || "";

  if (msg.includes("ENOENT") || msg.includes("no such file")) {
    return "A required file could not be read. Please re-upload and try again.";
  }
  if (msg.includes("password") || msg.includes("encrypted")) {
    return "This PDF is password-protected. Please remove the password first, then try again.";
  }
  if (msg.includes("Invalid PDF") || msg.includes("Could not find object") || msg.includes("ClosedPDF")) {
    return "The PDF file appears to be corrupted. Please try a different file.";
  }
  if (msg.includes("ENOMEM") || msg.includes("heap") || msg.includes("memory")) {
    return "The file is too large to process on our servers. Try splitting it into smaller parts first.";
  }
  if (msg.includes("timeout") || msg.includes("SIGKILL")) {
    return "Processing took too long. Try a smaller file or a simpler operation.";
  }

  return msg || "Processing failed. Please try again.";
}

export async function executeJob(jobId: string): Promise<void> {
  const job = getJob(jobId);
  if (!job) throw new Error("Job not found");

  if (job.state === "CANCELLED") return;

  await acquireSlot();
  try {
    await runJob(jobId);
  } finally {
    releaseSlot();
  }
}

async function runJob(jobId: string): Promise<void> {
  const job = getJob(jobId);
  if (!job) throw new Error("Job not found");

  if (job.state === "CANCELLED") return;

  updateJob(jobId, { state: "PROCESSING", processingStartedAt: Date.now() });
  logger.info("job_started", { jobId, toolId: job.toolId });

  const tracker = new ProgressTracker((snapshot) => {
    updateJob(jobId, { progress: snapshot });
  });
  tracker.update({ percent: 0, stage: "loading", message: "Starting conversion" });

  try {
    const converter = getConverter(job.toolId);
    if (!converter) {
      updateJob(jobId, { state: "FAILED", error: `No converter found for tool "${job.toolId}"` });
      return;
    }

    const jobDirPath = await getJobDir(jobId);
    if (!jobDirPath) {
      updateJob(jobId, { state: "FAILED", error: "Job directory not found" });
      return;
    }

    const input: ConverterInput = {
      jobDir: jobDirPath,
      files: job.files,
      options: job.options,
      onProgress: (snapshot) => tracker.update(snapshot),
    };

    tracker.update({ percent: 1, stage: "processing", message: "Starting conversion" });
    const result = await converter.convert(input);

    tracker.update({ percent: 90, stage: "finalizing", message: "Saving output" });

    const currentJob = getJob(jobId);
    if (currentJob?.state === "CANCELLED") return;

    const { stat } = await import("fs/promises");
    try {
      const fileStat = await stat(result.outputPath);
      if (fileStat.size === 0) {
        updateJob(jobId, {
          state: "FAILED",
          error: "Output file is empty. The conversion produced no output.",
        });
        return;
      }
    } catch {
      updateJob(jobId, {
        state: "FAILED",
        error: "Output file was not created. Conversion failed silently.",
      });
      return;
    }

    const resultBuffer = await readFileFromJob(jobId, result.outputFileName);
    const { fileId } = await storeResult(jobId, result.outputFileName, resultBuffer);

    tracker.complete("Conversion complete");
    const duration = Date.now() - job.createdAt;
    logger.info("job_completed", { jobId, toolId: job.toolId, duration });
    updateJob(jobId, {
      state: "COMPLETED",
      resultFileId: fileId,
      resultFileName: result.outputFileName,
      resultMimeType: result.outputMimeType,
      resultSize: resultBuffer.length,
      completedAt: Date.now(),
      duration,
      progress: tracker.snapshot(),
    });
  } catch (error) {
    const currentJob = getJob(jobId);
    if (currentJob?.state === "CANCELLED") return;
    const message = wrapConverterError(error);
    tracker.fail(message);
    const duration = Date.now() - job.createdAt;
    logger.warn("job_failed", { jobId, toolId: job.toolId, duration, error: message });
    updateJob(jobId, { state: "FAILED", error: message, duration, progress: tracker.snapshot() });
  }
}

export async function getJobStatus(jobId: string): Promise<Job | undefined> {
  return getJob(jobId);
}

export function cancelJob(jobId: string): { success: boolean; message: string } {
  const job = getJob(jobId);
  if (!job) return { success: false, message: "Job not found" };

  if (job.state === "COMPLETED") return { success: false, message: "Job already completed" };
  if (job.state === "FAILED") return { success: false, message: "Job already failed" };
  if (job.state === "CANCELLED") return { success: true, message: "Job already cancelled" };

  updateJob(jobId, {
    state: "CANCELLED",
    duration: Date.now() - job.createdAt,
    progress: { percent: 0, stage: "cancelled", message: "Cancelled by user" },
  });
  return { success: true, message: "Job cancelled" };
}

const STUCK_THRESHOLD_MS = 5 * 60 * 1000;

export function recoverStuckJobs(): number {
  let recovered = 0;
  const now = Date.now();

  for (const [id, job] of jobs) {
    if (job.state === "PROCESSING" && job.processingStartedAt) {
      const elapsed = now - job.processingStartedAt;
      if (elapsed > STUCK_THRESHOLD_MS) {
        updateJob(id, {
          state: "FAILED",
          error: "Processing timed out. The job took too long to complete.",
          progress: { percent: 0, stage: "failed", message: "Timed out" },
        });
        logger.warn("job_recovered", { jobId: id, toolId: job.toolId, reason: "processing_timeout", elapsed });
        recovered++;
      }
    } else if (job.state === "QUEUED" && now - job.createdAt > STUCK_THRESHOLD_MS) {
      updateJob(id, {
        state: "FAILED",
        error: "Job timed out waiting to be processed.",
      });
      logger.warn("job_recovered", { jobId: id, toolId: job.toolId, reason: "queue_timeout" });
      recovered++;
    }
  }

  return recovered;
}

let shutdownInitiated = g.__docvanta_shutdownInitiated ?? false;

function gracefulShutdown(signal: string): void {
  if (shutdownInitiated) return;
  shutdownInitiated = true;
  g.__docvanta_shutdownInitiated = true;

  logger.info("shutdown", { event: signal, activeJobs: jobs.size });

  for (const [id, job] of jobs) {
    if (job.state === "QUEUED" || job.state === "PROCESSING") {
      updateJob(id, {
        state: "FAILED",
        error: "Server is shutting down. Please try again.",
        progress: { percent: 0, stage: "failed", message: "Shutdown" },
      });
    }
  }

  const { stopCleanupScheduler } = require("./cleanup");
  stopCleanupScheduler();
}

if (typeof process !== "undefined") {
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}
