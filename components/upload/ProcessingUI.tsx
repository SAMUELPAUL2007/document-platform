"use client";

import type { ProcessingStatus } from "@/lib/processing/types";

import type { ProgressSnapshot } from "@/lib/progress";



interface ProcessingUIProps {
  status: ProcessingStatus;
  progress: number;
  progressSnapshot?: ProgressSnapshot;
  onCancel?: () => void;
  canCancel?: boolean;
}

const STAGE_LABELS: Record<string, string> = {
  validating: "Validating file",
  queued: "Waiting in queue",
  loading: "Loading document",
  processing: "Processing",
  finalizing: "Saving output",
  complete: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
};

export default function ProcessingUI({
  status,
  progress,
  progressSnapshot,
  onCancel,
  canCancel,
}: ProcessingUIProps) {
  const displayPercent = progressSnapshot?.percent ?? progress;
  const stageLabel = progressSnapshot?.stage
    ? STAGE_LABELS[progressSnapshot.stage] || progressSnapshot.stage
    : null;
  const message = progressSnapshot?.message;

  return (
    <div className="w-full py-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <div className="relative">
          <svg className="w-12 h-12" viewBox="0 0 48 48">
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-muted"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray="125.6"
              strokeDashoffset={125.6 - (125.6 * displayPercent) / 100}
              strokeLinecap="round"
              className="text-primary transition-all duration-300 ease-out -rotate-90 origin-center"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold text-foreground">
              {Math.round(displayPercent)}%
            </span>
          </div>
        </div>

        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            {status === "uploading" ? "Uploading your file..." : stageLabel || "Processing document..."}
          </p>
          {message && (
            <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
          )}
          {!message && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {status === "uploading"
                ? "Securely transferring your file"
                : progressSnapshot?.current && progressSnapshot?.total
                  ? `${progressSnapshot.current} / ${progressSnapshot.total} units`
                  : "This may take a moment for large files"}
            </p>
          )}
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
              style={{ width: `${displayPercent}%` }}
              role="progressbar"
              aria-valuenow={Math.round(displayPercent)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={status === "uploading" ? "Upload progress" : "Processing progress"}
            />
          </div>
        </div>
      </div>

      {canCancel && onCancel && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={onCancel}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Cancel processing
          </button>
        </div>
      )}
    </div>
  );
}
