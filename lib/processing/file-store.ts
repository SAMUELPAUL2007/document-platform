import { randomUUID } from "crypto";
import { mkdir, writeFile, readFile as fsReadFile, stat, rm, realpath } from "fs/promises";
import { join } from "path";
import type { JobFile } from "./types";
import { TEMP_DIR } from "@/lib/constants";

function jobDir(jobId: string): string {
  return join(TEMP_DIR, jobId);
}

export async function ensureJobDir(jobId: string): Promise<string> {
  const dir = jobDir(jobId);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function getJobDir(jobId: string): Promise<string | null> {
  const dir = jobDir(jobId);
  try {
    await stat(dir);
    return dir;
  } catch {
    return null;
  }
}

export async function storeFile(
  jobId: string,
  originalName: string,
  mimeType: string,
  buffer: Buffer
): Promise<JobFile> {
  const dir = await ensureJobDir(jobId);
  const id = randomUUID();
  const ext = originalName.includes(".")
    ? originalName.slice(originalName.lastIndexOf(".")).toLowerCase()
    : "";
  const storedName = `${id}${ext}`;
  const filePath = join(dir, storedName);

  await writeFile(filePath, buffer);

  return {
    id,
    originalName: sanitizeFilename(originalName),
    storedName,
    mimeType,
    size: buffer.length,
  };
}

export async function readFileFromJob(
  jobId: string,
  storedName: string
): Promise<Buffer> {
  const dir = jobDir(jobId);
  const filePath = join(dir, storedName);

  const realDir = await realpath(dir);
  let realFile: string;
  try {
    realFile = await realpath(filePath);
  } catch {
    throw new Error("File not found");
  }

  if (!realFile.startsWith(realDir)) {
    throw new Error("Path traversal detected");
  }

  return fsReadFile(filePath);
}

export async function storeResult(
  jobId: string,
  resultFileName: string,
  buffer: Buffer
): Promise<{ fileId: string; storedName: string }> {
  const dir = jobDir(jobId);
  const fileId = randomUUID();
  const ext = resultFileName.includes(".")
    ? resultFileName.slice(resultFileName.lastIndexOf(".")).toLowerCase()
    : "";
  const storedName = `result-${fileId}${ext}`;
  const filePath = join(dir, storedName);

  await writeFile(filePath, buffer);

  return { fileId, storedName };
}

export async function getResultBuffer(
  jobId: string,
  resultFileId: string,
  resultFileName: string
): Promise<Buffer | null> {
  const dir = jobDir(jobId);
  const ext = resultFileName.includes(".")
    ? resultFileName.slice(resultFileName.lastIndexOf("."))
    : "";
  const storedName = `result-${resultFileId}${ext}`;
  const filePath = join(dir, storedName);

  try {
    const realDir = await realpath(dir);
    const realFile = await realpath(filePath);

    if (!realFile.startsWith(realDir)) return null;

    await stat(filePath);
    return fsReadFile(filePath);
  } catch {
    return null;
  }
}

export async function removeJobDir(jobId: string): Promise<void> {
  const dir = jobDir(jobId);
  try {
    await rm(dir, { recursive: true, force: true });
  } catch {
    // Best effort cleanup
  }
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 200);
}
