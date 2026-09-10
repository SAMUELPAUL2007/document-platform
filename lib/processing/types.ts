import type { ProgressSnapshot } from "../progress";

export type JobState = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED" | "CLEANED";

export type ProcessingStatus = "idle" | "uploading" | "processing" | "complete" | "error";

export interface JobFile {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
}

export interface Job {
  id: string;
  toolId: string;
  state: JobState;
  files: JobFile[];
  options?: Record<string, string>;
  resultFileId?: string;
  resultFileName?: string;
  resultMimeType?: string;
  resultSize?: number;
  error?: string;
  progress?: ProgressSnapshot;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  processingStartedAt?: number;
  duration?: number;
}

export interface UploadResponse {
  jobId: string;
  files: Array<{ id: string; name: string; size: number }>;
}

export interface JobStatusResponse {
  jobId: string;
  state: JobState;
  progress?: ProgressSnapshot;
  error?: string;
  resultFileId?: string;
  resultFileName?: string;
  duration?: number;
}

export interface ConverterInput {
  jobDir: string;
  files: JobFile[];
  options?: Record<string, string>;
  onProgress?: (snapshot: ProgressSnapshot) => void;
}

export interface ConverterResult {
  outputFileName: string;
  outputMimeType: string;
  outputPath: string;
}

export interface Converter {
  id: string;
  acceptedTypes: string[];
  convert(input: ConverterInput): Promise<ConverterResult>;
}

export const PAGE_SIZES = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
  original: null,
} as const;

export type PageSize = keyof typeof PAGE_SIZES;
