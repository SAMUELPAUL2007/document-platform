import { readdir, stat } from "fs/promises";
import { join } from "path";
import { TEMP_DIR } from "@/lib/constants";
import { logger } from "@/lib/logger";

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const JOB_MAX_AGE_MS = 60 * 60 * 1000;

export type CleanupCycleCallback = () => void;

// ─── HMR-safe global state ──────────────────────────────────
const g = globalThis as unknown as {
  __docvanta_cleanupTimer?: ReturnType<typeof setInterval> | null;
  __docvanta_startupChecked?: boolean;
  __docvanta_cleanupCallback?: CleanupCycleCallback | null;
};

let cleanupTimer: ReturnType<typeof setInterval> | null = g.__docvanta_cleanupTimer ?? null;
g.__docvanta_cleanupTimer = cleanupTimer;

let startupChecked = g.__docvanta_startupChecked ?? false;
g.__docvanta_startupChecked = startupChecked;

let cleanupCallback: CleanupCycleCallback | null = g.__docvanta_cleanupCallback ?? null;
g.__docvanta_cleanupCallback = cleanupCallback;

export async function cleanupTempDir(): Promise<number> {
  let removed = 0;

  try {
    const entries = await readdir(TEMP_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const dirPath = join(TEMP_DIR, entry.name);
      try {
        const dirStat = await stat(dirPath);
        const age = Date.now() - dirStat.mtimeMs;

        if (age > JOB_MAX_AGE_MS) {
          const { rm } = await import("fs/promises");
          await rm(dirPath, { recursive: true, force: true });
          removed++;
        }
      } catch {
        // Skip directories we can't access
      }
    }
  } catch (err) {
    logger.warn("temp_dir_access_error", { error: err instanceof Error ? err.message : "unknown" });
  }

  return removed;
}

export function runCleanupCycle(): void {
  cleanupTempDir().catch((err) => {
    logger.warn("cleanup_cycle_error", { error: err instanceof Error ? err.message : "unknown" });
  });
  if (cleanupCallback) {
    try {
      cleanupCallback();
    } catch (err) {
      logger.warn("job_recovery_error", { error: err instanceof Error ? err.message : "unknown" });
    }
  }
}

async function runStartupChecks(): Promise<void> {
  if (startupChecked) return;
  startupChecked = true;
  g.__docvanta_startupChecked = true;
  try {
    const { checkDependencies } = await import("@/lib/startup-checks");
    await checkDependencies();
  } catch {
    // Non-critical — log and continue
  }
}

export function startCleanupScheduler(onCycle?: CleanupCycleCallback): void {
  if (onCycle) {
    cleanupCallback = onCycle;
    g.__docvanta_cleanupCallback = onCycle;
  }

  if (cleanupTimer) return;

  runStartupChecks().catch(() => {});

  cleanupTimer = setInterval(() => {
    runCleanupCycle();
  }, CLEANUP_INTERVAL_MS);

  g.__docvanta_cleanupTimer = cleanupTimer;

  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

export function stopCleanupScheduler(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    g.__docvanta_cleanupTimer = null;
  }
}
