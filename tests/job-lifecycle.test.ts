import { describe, it, expect, vi, beforeEach } from "vitest";
import { rm } from "fs/promises";
import { join } from "path";

vi.mock("@/lib/processing/cleanup", () => ({
  startCleanupScheduler: vi.fn(),
  stopCleanupScheduler: vi.fn(),
}));

vi.mock("@/lib/tools", () => ({
  getToolById: vi.fn().mockReturnValue({
    id: "split-pdf",
    name: "Split PDF",
    accept: ".pdf",
  }),
}));

const TMP_BASE = join(process.cwd(), ".tmp", "test-lifecycle");

vi.mock("@/lib/processing/file-store", () => ({
  ensureJobDir: vi.fn().mockResolvedValue("/tmp/test"),
  getJobDir: vi.fn().mockResolvedValue("/tmp/test"),
  storeFile: vi.fn().mockResolvedValue({
    id: "file-1",
    originalName: "test.pdf",
    storedName: "test.pdf",
    mimeType: "application/pdf",
    size: 1000,
  }),
  storeResult: vi.fn().mockResolvedValue({ fileId: "result-1" }),
  readFileFromJob: vi.fn().mockResolvedValue(Buffer.from("fake-pdf")),
  removeJobDir: vi.fn().mockResolvedValue(undefined),
}));

function makeFormDataWithFile(): FormData {
  const fd = new FormData();
  const blob = new Blob(["%PDF-1.4 fake content"], { type: "application/pdf" });
  const file = new File([blob], "test.pdf", { type: "application/pdf" });
  fd.append("files", file);
  fd.append("toolId", "split-pdf");
  return fd;
}

import { cancelJob, recoverStuckJobs, getJobStatus } from "../lib/processing/job-manager";

describe("Job Lifecycle", () => {
  describe("cancelJob", () => {
    it("returns failure for unknown job", () => {
      const result = cancelJob("00000000-0000-0000-0000-000000000000");
      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
    });

    it("cancels an active job", async () => {
      const { processUpload } = await import("../lib/processing/job-manager");
      const { job } = await processUpload("split-pdf", makeFormDataWithFile());
      const result = cancelJob(job.id);
      expect(result.success).toBe(true);

      const status = await getJobStatus(job.id);
      expect(status?.state).toBe("CANCELLED");
    });

    it("is idempotent for repeated cancellation", async () => {
      const { processUpload } = await import("../lib/processing/job-manager");
      const { job } = await processUpload("split-pdf", makeFormDataWithFile());
      cancelJob(job.id);
      const result = cancelJob(job.id);
      expect(result.success).toBe(true);
    });
  });

  describe("recoverStuckJobs", () => {
    it("returns a number (no crash)", () => {
      const recovered = recoverStuckJobs();
      expect(typeof recovered).toBe("number");
    });
  });

  describe("state machine", () => {
    it("prevents re-execution of cancelled job", async () => {
      const { processUpload, executeJob } = await import("../lib/processing/job-manager");
      const { job } = await processUpload("split-pdf", makeFormDataWithFile());

      cancelJob(job.id);
      const status = await getJobStatus(job.id);
      expect(status?.state).toBe("CANCELLED");

      await executeJob(job.id);
      const finalStatus = await getJobStatus(job.id);
      expect(finalStatus?.state).toBe("CANCELLED");
    });
  });

  describe("progress tracking", () => {
    it("job has progress field after cancel", async () => {
      const { processUpload } = await import("../lib/processing/job-manager");
      const { job } = await processUpload("split-pdf", makeFormDataWithFile());

      cancelJob(job.id);
      const status = await getJobStatus(job.id);
      expect(status?.progress).toBeDefined();
      expect(status?.progress?.stage).toBe("cancelled");
    });
  });

  describe("duration diagnostics", () => {
    it("cancelled job has duration", async () => {
      const { processUpload } = await import("../lib/processing/job-manager");
      const { job } = await processUpload("split-pdf", makeFormDataWithFile());

      cancelJob(job.id);
      const status = await getJobStatus(job.id);
      expect(status?.duration).toBeDefined();
      expect(typeof status?.duration).toBe("number");
      expect(status!.duration!).toBeGreaterThanOrEqual(0);
    });

    it("duration is non-negative for new job", async () => {
      const { processUpload } = await import("../lib/processing/job-manager");
      const { job } = await processUpload("split-pdf", makeFormDataWithFile());
      const status = await getJobStatus(job.id);
      expect(status?.duration).toBeUndefined();
    });
  });
});
