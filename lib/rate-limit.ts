import {
  RATE_LIMIT_HEAVY_MAX,
  RATE_LIMIT_NORMAL_MAX,
  RATE_LIMIT_DEFAULT_MAX,
  RATE_LIMIT_DOWNLOAD_MAX,
  RATE_LIMIT_JOB_STATUS_MAX,
  RATE_LIMIT_WINDOW_MS,
} from "./constants";

export interface RateLimitPolicy {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
  windowMs: number;
}

function makePolicy(maxRequests: number): RateLimitPolicy {
  return { windowMs: RATE_LIMIT_WINDOW_MS, maxRequests };
}

const DEFAULT_POLICY: RateLimitPolicy = makePolicy(RATE_LIMIT_DEFAULT_MAX);
const UPLOAD_POLICY: RateLimitPolicy = makePolicy(RATE_LIMIT_DEFAULT_MAX);
const JOB_STATUS_POLICY: RateLimitPolicy = makePolicy(RATE_LIMIT_JOB_STATUS_MAX);
const DOWNLOAD_POLICY: RateLimitPolicy = makePolicy(RATE_LIMIT_DOWNLOAD_MAX);

const HEAVY_TOOLS = new Set([
  "ocr-pdf",
  "compress-pdf",
]);

const NORMAL_TOOLS = new Set([
  "images-to-pdf",
  "pdf-to-jpg",
  "pdf-to-png",
  "pdf-to-word",
  "pdf-to-ppt",
  "word-to-pdf",
  "ppt-to-pdf",
]);

const store = new Map<string, RateLimitEntry>();

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.windowStart > entry.windowMs) {
      store.delete(key);
    }
  }
}

function ensureCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(cleanup, 60_000);
  if (cleanupTimer.unref) cleanupTimer.unref();
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterMs: number;
  resetAt?: number;
}

export function getToolUploadPolicy(toolId: string): RateLimitPolicy {
  if (HEAVY_TOOLS.has(toolId)) {
    return makePolicy(RATE_LIMIT_HEAVY_MAX);
  }
  if (NORMAL_TOOLS.has(toolId)) {
    return makePolicy(RATE_LIMIT_NORMAL_MAX);
  }
  return UPLOAD_POLICY;
}

export function getDownloadPolicy(): RateLimitPolicy {
  return DOWNLOAD_POLICY;
}

export function getJobStatusPolicy(): RateLimitPolicy {
  return JOB_STATUS_POLICY;
}

export function checkRateLimit(
  identifier: string,
  policy: RateLimitPolicy = DEFAULT_POLICY
): RateLimitResult {
  ensureCleanup();

  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now - entry.windowStart > entry.windowMs) {
    store.set(identifier, { count: 1, windowStart: now, windowMs: policy.windowMs });
    return {
      allowed: true,
      limit: policy.maxRequests,
      remaining: policy.maxRequests - 1,
      retryAfterMs: 0,
      resetAt: now + policy.windowMs,
    };
  }

  entry.count++;

  if (entry.count > policy.maxRequests) {
    const retryAfterMs = entry.windowMs - (now - entry.windowStart);
    return {
      allowed: false,
      limit: policy.maxRequests,
      remaining: 0,
      retryAfterMs: Math.max(0, retryAfterMs),
      resetAt: entry.windowStart + entry.windowMs,
    };
  }

  return {
    allowed: true,
    limit: policy.maxRequests,
    remaining: policy.maxRequests - entry.count,
    retryAfterMs: 0,
    resetAt: entry.windowStart + entry.windowMs,
  };
}

export function getRateLimitStore(): Map<string, RateLimitEntry> {
  return store;
}

export function resetRateLimit(identifier?: string): void {
  if (identifier) {
    store.delete(identifier);
  } else {
    store.clear();
  }
}

export function applyRateLimitHeaders(
  res: { setHeader: (k: string, v: string) => void },
  result: RateLimitResult
): void {
  res.setHeader("X-RateLimit-Limit", String(result.limit));
  res.setHeader("X-RateLimit-Remaining", String(result.remaining));

  if (!result.allowed) {
    const retryAfterSec = Math.ceil(result.retryAfterMs / 1000);
    res.setHeader("Retry-After", String(retryAfterSec));
    if (result.resetAt !== undefined) {
      const resetSec = Math.ceil((result.resetAt - Date.now()) / 1000);
      res.setHeader("X-RateLimit-Reset", String(resetSec));
    }
  }
}
