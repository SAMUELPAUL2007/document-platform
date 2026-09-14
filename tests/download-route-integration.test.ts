import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { rm } from "fs/promises";
import { TEMP_DIR } from "../lib/constants";
import { ensureJobDir } from "../lib/processing/file-store";
import { GET } from "../app/api/jobs/[jobId]/download/route";

function makeRequest(jobId: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/jobs/${jobId}/download`);
}

function makeParams(jobId: string): { params: Promise<{ jobId: string }> } {
  return { params: Promise.resolve({ jobId }) };
}

beforeEach(async () => {
  await rm(TEMP_DIR, { recursive: true, force: true });
  await new Promise<void>((r) => setTimeout(r, 100));
});

afterEach(async () => {
  await rm(TEMP_DIR, { recursive: true, force: true });
});

describe("Download route handler: direct invocation", () => {
  it("returns 404 JSON with 'Job not found' for non-existent job", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const response = await GET(makeRequest(fakeId), makeParams(fakeId));

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Job not found");
  });

  it("returns 400 JSON for invalid job ID format", async () => {
    const response = await GET(
      makeRequest("not-a-uuid"),
      makeParams("not-a-uuid")
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid job ID format");
  });

  it("returns 404 JSON when result metadata is missing (no resultFileId)", async () => {
    const jobId = "00000000-0000-0000-0000-000000000010";
    await ensureJobDir(jobId);

    const { processUpload } = await import("../lib/processing/job-manager");

    const formData = new FormData();
    const minimalPdf = Buffer.from(
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 100 100]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF"
    );
    const file = new File([minimalPdf], "test.pdf", { type: "application/pdf" });
    formData.append("files", file);
    formData.append("toolId", "pdf-to-word");

    const { job } = await processUpload("pdf-to-word", formData);

    const response = await GET(makeRequest(job.id), makeParams(job.id));

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Job is not completed yet");
  });

  it("returns the result buffer as binary when job is COMPLETED with valid metadata", async () => {
    const { processUpload, executeJob, getJobStatus } = await import(
      "../lib/processing/job-manager"
    );

    const minimalPdf = Buffer.from(
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 100 100]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF"
    );
    const formData = new FormData();
    const file = new File([minimalPdf], "sample.pdf", {
      type: "application/pdf",
    });
    formData.append("files", file);
    formData.append("toolId", "pdf-to-word");

    const { job } = await processUpload("pdf-to-word", formData);
    await executeJob(job.id);

    const finalJob = await getJobStatus(job.id);
    expect(finalJob).toBeDefined();
    expect(finalJob!.state).toBe("COMPLETED");

    const response = await GET(makeRequest(job.id), makeParams(job.id));

    expect(response.status).toBe(200);

    const contentType = response.headers.get("Content-Type");
    expect(contentType).toContain("wordprocessingml");

    const contentDisposition = response.headers.get("Content-Disposition");
    expect(contentDisposition).toContain(".docx");
    expect(contentDisposition).toContain("attachment");

    const body = await response.arrayBuffer();
    expect(body.byteLength).toBeGreaterThan(0);
  });

  it("returns 404 JSON when result file is missing from disk", async () => {
    const { processUpload, executeJob, getJobStatus } = await import(
      "../lib/processing/job-manager"
    );

    const minimalPdf = Buffer.from(
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 100 100]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF"
    );
    const formData = new FormData();
    const file = new File([minimalPdf], "sample.pdf", {
      type: "application/pdf",
    });
    formData.append("files", file);
    formData.append("toolId", "pdf-to-word");

    const { job } = await processUpload("pdf-to-word", formData);
    await executeJob(job.id);

    const finalJob = await getJobStatus(job.id);
    expect(finalJob).toBeDefined();
    expect(finalJob!.state).toBe("COMPLETED");
    expect(finalJob!.resultFileId).toBeDefined();

    const jobDir = await ensureJobDir(job.id);
    const { readdir } = await import("fs/promises");
    const files = await readdir(jobDir);
    for (const f of files) {
      if (f.startsWith("result-")) {
        const { unlink } = await import("fs/promises");
        const { join } = await import("path");
        await unlink(join(jobDir, f));
      }
    }

    const response = await GET(makeRequest(job.id), makeParams(job.id));

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Result file not found on disk");
  });

  it("response body is ALWAYS JSON for error cases (never HTML)", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const response = await GET(makeRequest(fakeId), makeParams(fakeId));

    expect(response.status).toBe(404);

    const contentTypeHeader = response.headers.get("content-type") || "";
    expect(contentTypeHeader).toContain("application/json");

    const data = await response.json();
    expect(typeof data.error).toBe("string");
    expect(data.error.length).toBeGreaterThan(0);
  });
});

describe("Download route handler: full lifecycle (upload → convert → download)", () => {
  it(
    "end-to-end: upload PDF, convert to docx, download result",
    async () => {
      const { processUpload, executeJob, getJobStatus } = await import(
        "../lib/processing/job-manager"
      );

      const minimalPdf = Buffer.from(
        "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 100 100]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF"
      );
      const formData = new FormData();
      const file = new File([minimalPdf], "sample.pdf", {
        type: "application/pdf",
      });
      formData.append("files", file);
      formData.append("toolId", "pdf-to-word");

      const { job } = await processUpload("pdf-to-word", formData);
      expect(job.id).toBeDefined();
      expect(job.state).toBe("QUEUED");

      await executeJob(job.id);

      const finalJob = await getJobStatus(job.id);
      expect(finalJob).toBeDefined();

      if (finalJob!.state !== "COMPLETED") {
        console.error("Job did not complete:", finalJob!.state, finalJob!.error);
      }
      expect(finalJob!.state).toBe("COMPLETED");
      expect(finalJob!.resultFileId).toBeDefined();
      expect(finalJob!.resultFileName).toBeDefined();
      expect(finalJob!.resultMimeType).toBeDefined();

      const response = await GET(makeRequest(job.id), makeParams(job.id));

      expect(response.status).toBe(200);

      const body = await response.arrayBuffer();
      expect(body.byteLength).toBeGreaterThan(0);

      const contentDisposition = response.headers.get("Content-Disposition") || "";
      expect(contentDisposition).toContain("attachment");
    },
    { timeout: 30_000 }
  );
});
