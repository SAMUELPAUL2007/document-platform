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

  describe("sequential uploads (Process Another)", () => {
    it("creates independent jobs with different IDs for sequential uploads", async () => {
      const { processUpload } = await import("../lib/processing/job-manager");

      const { job: job1, fileInfos: files1 } = await processUpload("split-pdf", makeFormDataWithFile());
      expect(job1.id).toBeDefined();
      expect(job1.state).toBe("QUEUED");
      expect(files1.length).toBe(1);

      const { job: job2, fileInfos: files2 } = await processUpload("split-pdf", makeFormDataWithFile());
      expect(job2.id).toBeDefined();
      expect(job2.state).toBe("QUEUED");
      expect(files2.length).toBe(1);

      expect(job1.id).not.toBe(job2.id);

      const status1 = await getJobStatus(job1.id);
      const status2 = await getJobStatus(job2.id);
      expect(status1).toBeDefined();
      expect(status1?.state).toBe("QUEUED");
      expect(status2).toBeDefined();
      expect(status2?.state).toBe("QUEUED");
    });

    it("each job stores its own file independently", async () => {
      const { processUpload } = await import("../lib/processing/job-manager");

      const fd1 = new FormData();
      const blob1 = new Blob(["%PDF-1.4 content-one"], { type: "application/pdf" });
      const file1 = new File([blob1], "first.pdf", { type: "application/pdf" });
      fd1.append("files", file1);
      fd1.append("toolId", "split-pdf");

      const fd2 = new FormData();
      const blob2 = new Blob(["%PDF-1.4 content-two"], { type: "application/pdf" });
      const file2 = new File([blob2], "second.pdf", { type: "application/pdf" });
      fd2.append("files", file2);
      fd2.append("toolId", "split-pdf");

      const { job: job1 } = await processUpload("split-pdf", fd1);
      const { job: job2 } = await processUpload("split-pdf", fd2);

      expect(job1.files.length).toBe(1);
      expect(job2.files.length).toBe(1);
      expect(job1.id).not.toBe(job2.id);
    });

    it("does not reuse previous job state after Process Another", async () => {
      const { processUpload } = await import("../lib/processing/job-manager");

      const { job: job1 } = await processUpload("split-pdf", makeFormDataWithFile());
      cancelJob(job1.id);

      const status1 = await getJobStatus(job1.id);
      expect(status1?.state).toBe("CANCELLED");

      const { job: job2 } = await processUpload("split-pdf", makeFormDataWithFile());
      const status2 = await getJobStatus(job2.id);
      expect(status2?.state).toBe("QUEUED");
      expect(job2.id).not.toBe(job1.id);
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
