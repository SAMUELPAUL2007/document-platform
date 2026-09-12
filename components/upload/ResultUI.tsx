"use client";

import Button from "@/components/ui/Button";
import { formatFileSize, getFileExtension } from "@/lib/file-utils";

interface ResultUIProps {
  toolName: string;
  heading?: string;
  fileName?: string;
  fileSize?: number;
  onDownload?: () => void;
  onReset: () => void;
}

export default function ResultUI({ toolName, heading, fileName, fileSize, onDownload, onReset }: ResultUIProps) {
  const displayHeading = heading || "Your file is ready";
  return (
    <div className="w-full py-6 text-center animate-scale-in" role="status" aria-live="polite">
      <div className="w-14 h-14 mx-auto rounded-full bg-success-light flex items-center justify-center mb-3">
        <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-foreground">{displayHeading}</h3>

      {fileName && (
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border">
          <span className="text-sm font-medium text-foreground truncate max-w-[200px]" title={fileName}>
            {fileName}
          </span>
          {fileSize !== undefined && (
            <>
              <span className="text-xs text-muted-foreground">&middot;</span>
              <span className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</span>
            </>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-center gap-3">
        {onDownload && (
          <Button onClick={onDownload} aria-label={`Download ${fileName || "result"}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download
          </Button>
        )}
        <Button variant="secondary" onClick={onReset}>
          Convert another file
        </Button>
      </div>
    </div>
  );
}
