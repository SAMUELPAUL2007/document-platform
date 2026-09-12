import { join } from "path";

export const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "", 10) || 100 * 1024 * 1024;

export const TEMP_DIR = join(process.env.TEMP_DIR || process.cwd(), ".tmp");

export const MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_CONCURRENT_JOBS || "", 10) || 4;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const RATE_LIMIT_HEAVY_MAX = envInt("RATE_LIMIT_HEAVY_MAX", 10);
export const RATE_LIMIT_NORMAL_MAX = envInt("RATE_LIMIT_NORMAL_MAX", 15);
export const RATE_LIMIT_DEFAULT_MAX = envInt("RATE_LIMIT_DEFAULT_MAX", 20);
export const RATE_LIMIT_DOWNLOAD_MAX = envInt("RATE_LIMIT_DOWNLOAD_MAX", 60);
export const RATE_LIMIT_JOB_STATUS_MAX = envInt("RATE_LIMIT_JOB_STATUS_MAX", 30);
export const RATE_LIMIT_WINDOW_MS = envInt("RATE_LIMIT_WINDOW_MS", 60_000);

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://docvanta.app";
