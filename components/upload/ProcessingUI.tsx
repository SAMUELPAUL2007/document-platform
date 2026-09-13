"use client";

import type { ProcessingStatus } from "@/lib/processing/types";
import type { ProgressSnapshot } from "@/lib/progress";
import Button from "@/components/ui/Button";

export type DisplayState =
  | "idle"
  | "uploading"
  | "queued"
  | "processing_with_progress"
  | "processing_indeterminate"
  | "completed"
  | "failed"
  | "cancelled";

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

function getDisplayState(status: ProcessingStatus, snapshot?: ProgressSnapshot): DisplayState {
  if (status === "idle") return "idle";
  if (status === "uploading") return "uploading";
  if (status === "error") return "failed";
  if (status === "complete") return "completed";
  if (status === "processing") {
    if (snapshot?.stage === "queued") return "queued";
    if (snapshot?.percent !== undefined && snapshot.percent > 0) return "processing_with_progress";
    return "processing_indeterminate";
  }
  return "processing_indeterminate";
}

export default function ProcessingUI({
  status,
  progress,
  progressSnapshot,
  onCancel,
  canCancel,
}: ProcessingUIProps) {
  const displayState = getDisplayState(status, progressSnapshot);
  const displayPercent = progressSnapshot?.percent ?? progress;
  const stageLabel = progressSnapshot?.stage
    ? STAGE_LABELS[progressSnapshot.stage] || progressSnapshot.stage
    : null;
  const message = progressSnapshot?.message;
  const isIndeterminate = displayState === "processing_indeterminate" || displayState === "queued";
  const isCompleted = displayState === "completed";

  return (
    <div className="w-full py-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <div className="relative">
          {isIndeterminate ? (
            <div className="w-12 h-12 relative">
              <svg className="w-12 h-12 animate-spin" viewBox="0 0 48 48" style={{ animationDuration: '1.5s' }}>
                <circle
                  cx="24" cy="24" r="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-muted opacity-20"
                />
                <circle
                  cx="24" cy="24" r="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray="80 50"
                  strokeLinecap="round"
                  className="text-primary"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              </div>
            </div>
          ) : (
            <svg className="w-12 h-12" viewBox="0 0 48 48">
              <circle
                cx="24" cy="24" r="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-muted"
              />
              <circle
                cx="24" cy="24" r="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray="125.6"
                strokeDashoffset={isCompleted ? 0 : 125.6 - (125.6 * displayPercent) / 100}
                strokeLinecap="round"
                className={`transition-all duration-300 ease-out -rotate-90 origin-center ${isCompleted ? 'text-green-500' : 'text-primary'}`}
              />
            </svg>
          )}
          {!isIndeterminate && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-semibold text-foreground">
                {isCompleted ? '✓' : `${Math.round(displayPercent)}%`}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            {status === "uploading"
              ? "Uploading your file..."
              : isCompleted
                ? "Conversion complete!"
                : displayState === "queued"
                  ? "Waiting in queue..."
                  : stageLabel
                    ? `${stageLabel}...`
                    : "Converting your file..."}
          </p>
          {message && (
            <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
          )}
          {!message && !isCompleted && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {status === "uploading"
                ? "Securely transferring your file"
                : isIndeterminate
                  ? "This may take a moment for large files"
                  : progressSnapshot?.current && progressSnapshot?.total
                    ? `${progressSnapshot.current} / ${progressSnapshot.total} units`
                    : "Converting your file"}
            </p>
          )}
          {!isIndeterminate && !isCompleted && (
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                style={{ width: `${displayPercent}%` }}
                role="progressbar"
                aria-valuenow={Math.round(displayPercent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={status === "uploading" ? "Upload progress" : "Conversion progress"}
              />
            </div>
          )}
          {isIndeterminate && !isCompleted && (
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full animate-indeterminate-bar"
                style={{ width: '40%' }}
              />
            </div>
          )}
        </div>
      </div>

      {canCancel && onCancel && !isCompleted && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" size="sm" onClick={onCancel} aria-label="Cancel processing">
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
