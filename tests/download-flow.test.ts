import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm, stat } from "fs/promises";
import { join } from "path";
import {
  ensureJobDir,
  storeFile,
  readFileFromJob,
  storeResult,
  getResultBuffer,
  getJobDir,
  removeJobDir,
} from "../lib/processing/file-store";
import { TEMP_DIR } from "../lib/constants";

beforeEach(async () => {
  await mkdir(TEMP_DIR, { recursive: true });
});

afterEach(async () => {
  await rm(TEMP_DIR, { recursive: true, force: true });
});

describe("file-store: getResultBuffer", () => {
  it("returns buffer when result file exists on disk", async () => {
    const jobId = "00000000-0000-0000-0000-000000000001";
    await ensureJobDir(jobId);

    const buffer = Buffer.from("hello docx content");
    const { fileId, storedName } = await storeResult(jobId, "output.docx", buffer);

    const result = await getResultBuffer(jobId, fileId, "output.docx");
    expect(result).not.toBeNull();
    expect(result!.toString()).toBe("hello docx content");
  });

  it("returns null when job directory does not exist", async () => {
    const result = await getResultBuffer(
      "00000000-0000-0000-0000-000000000099",
      "fake-file-id",
      "output.docx"
    );
    expect(result).toBeNull();
  });

  it("returns null when result file does not exist in directory", async () => {
    const jobId = "00000000-0000-0000-0000-000000000002";
    await ensureJobDir(jobId);

    const result = await getResultBuffer(jobId, "nonexistent-id", "output.docx");
    expect(result).toBeNull();
  });

  it("returns null for path traversal attempt", async () => {
    const jobId = "00000000-0000-0000-0000-000000000003";
    await ensureJobDir(jobId);

    const traversalId = "../../etc/passwd";
    const result = await getResultBuffer(jobId, traversalId, "passwd.txt");
    expect(result).toBeNull();
  });

  it("handles extension extraction correctly", async () => {
    const jobId = "00000000-0000-0000-0000-000000000004";
    await ensureJobDir(jobId);

    const buffer = Buffer.from("xlsx content");
    const { fileId } = await storeResult(jobId, "spreadsheet.xlsx", buffer);

    const result = await getResultBuffer(jobId, fileId, "spreadsheet.xlsx");
    expect(result).not.toBeNull();
    expect(result!.toString()).toBe("xlsx content");
  });

  it("handles result file with no extension", async () => {
    const jobId = "00000000-0000-0000-0000-000000000005";
    await ensureJobDir(jobId);

    const buffer = Buffer.from("no ext content");
    const { fileId } = await storeResult(jobId, "output", buffer);

    const result = await getResultBuffer(jobId, fileId, "output");
    expect(result).not.toBeNull();
    expect(result!.toString()).toBe("no ext content");
  });
});

describe("file-store: readFileFromJob", () => {
  it("reads a stored file by its stored name", async () => {
    const jobId = "00000000-0000-0000-0000-000000000010";
    await ensureJobDir(jobId);

    const buffer = Buffer.from("input pdf bytes");
    const file = await storeFile(jobId, "input.pdf", "application/pdf", buffer);

    const readBuffer = await readFileFromJob(jobId, file.storedName);
    expect(readBuffer.toString()).toBe("input pdf bytes");
  });

  it("throws when file does not exist", async () => {
    const jobId = "00000000-0000-0000-0000-000000000011";
    await ensureJobDir(jobId);

    await expect(readFileFromJob(jobId, "nonexistent.pdf")).rejects.toThrow("File not found");
  });

  it("throws when job directory does not exist", async () => {
    await expect(
      readFileFromJob("00000000-0000-0000-0000-000000000099", "file.pdf")
    ).rejects.toThrow();
  });

  it("throws for path traversal attempt", async () => {
    const jobId = "00000000-0000-0000-0000-000000000012";
    await ensureJobDir(jobId);

    await expect(
      readFileFromJob(jobId, "../../etc/passwd")
    ).rejects.toThrow("Path traversal detected");
  });
});

describe("file-store: full round-trip (store → read result)", () => {
  it("stores and retrieves a docx result buffer", async () => {
    const jobId = "00000000-0000-0000-0000-000000000020";
    await ensureJobDir(jobId);

    const originalBuffer = Buffer.from("fake docx binary content here");

    const { fileId } = await storeResult(jobId, "report.docx", originalBuffer);

    const retrieved = await getResultBuffer(jobId, fileId, "report.docx");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.equals(originalBuffer)).toBe(true);
  });

  it("does not confuse different job directories", async () => {
    const job1 = "00000000-0000-0000-0000-000000000030";
    const job2 = "00000000-0000-0000-0000-000000000031";

    await ensureJobDir(job1);
    await ensureJobDir(job2);

    const buf1 = Buffer.from("job1 content");
    const buf2 = Buffer.from("job2 content");

    const { fileId: id1 } = await storeResult(job1, "output.docx", buf1);
    const { fileId: id2 } = await storeResult(job2, "output.docx", buf2);

    const result1 = await getResultBuffer(job1, id1, "output.docx");
    const result2 = await getResultBuffer(job2, id2, "output.docx");

    expect(result1!.toString()).toBe("job1 content");
    expect(result2!.toString()).toBe("job2 content");

    const crossResult = await getResultBuffer(job1, id2, "output.docx");
    expect(crossResult).toBeNull();
  });
});

describe("file-store: removeJobDir", () => {
  it("removes the job directory and its contents", async () => {
    const jobId = "00000000-0000-0000-0000-000000000040";
    const dir = await ensureJobDir(jobId);
    await writeFile(join(dir, "test.txt"), "content");

    await removeJobDir(jobId);

    const dirPath = join(TEMP_DIR, jobId);
    await expect(stat(dirPath)).rejects.toThrow();
  });

  it("is idempotent for non-existent directory", async () => {
    await removeJobDir("00000000-0000-0000-0000-000000000099");
  });
});

describe("file-store: getJobDir", () => {
  it("returns the directory path when it exists", async () => {
    const jobId = "00000000-0000-0000-0000-000000000050";
    await ensureJobDir(jobId);

    const dir = await getJobDir(jobId);
    expect(dir).toBe(join(TEMP_DIR, jobId));
  });

  it("returns null when directory does not exist", async () => {
    const dir = await getJobDir("00000000-0000-0000-0000-000000000099");
    expect(dir).toBeNull();
  });
});
