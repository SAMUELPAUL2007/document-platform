import type { ProgressSnapshot } from "./progress";



export interface UploadResult {
  jobId: string;
  files: Array<{ id: string; name: string; size: number }>;
}

export interface JobStatus {
  jobId: string;
  state: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED" | "CLEANED";
  progress?: ProgressSnapshot;
  error?: string;
  resultFileId?: string;
  resultFileName?: string;
  duration?: number;
}

export async function uploadFiles(
  toolId: string,
  files: File[],
  options?: Record<string, string>
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("toolId", toolId);

  for (const file of files) {
    formData.append("files", file);
  }

  if (options) {
    for (const [key, value] of Object.entries(options)) {
      formData.append(key, value);
    }
  }

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Upload failed (${response.status})`);
  }

  return response.json();
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const response = await fetch(`/api/jobs/${jobId}`);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Status check failed (${response.status})`);
  }

  return response.json();
}

export function getDownloadUrl(jobId: string): string {
  return `/api/jobs/${jobId}/download`;
}

export async function cancelJobApi(jobId: string): Promise<{ message: string }> {
  const response = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Failed to cancel job");
  }
  return response.json();
}

export async function pollJobStatus(
  jobId: string,
  onStatus: (status: JobStatus) => void,
  intervalMs = 1000,
  signal?: AbortSignal,
  timeoutMs = 120_000
): Promise<JobStatus> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const maxRetries = 3;
    let retryCount = 0;

    const timeoutSec = Math.round(timeoutMs / 1000);
    const timeout = setTimeout(() => {
      reject(new Error(`Processing timed out after ${timeoutSec} seconds`));
    }, timeoutMs);

    const check = async () => {
      if (signal?.aborted) {
        clearTimeout(timeout);
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }

      try {
        const status = await getJobStatus(jobId);
        onStatus(status);

        if (
          status.state === "COMPLETED" ||
          status.state === "FAILED" ||
          status.state === "CANCELLED" ||
          status.state === "CLEANED"
        ) {
          clearTimeout(timeout);
          resolve(status);
          return;
        }

        const nextCheck = setTimeout(check, intervalMs);
        signal?.addEventListener("abort", () => clearTimeout(nextCheck), { once: true });
      } catch (error) {
        if (signal?.aborted) {
          clearTimeout(timeout);
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        retryCount++;
        if (retryCount > maxRetries) {
          clearTimeout(timeout);
          reject(error);
          return;
        }
        const nextCheck = setTimeout(check, intervalMs);
        signal?.addEventListener("abort", () => clearTimeout(nextCheck), { once: true });
      }
    };

    check();
  });
}
