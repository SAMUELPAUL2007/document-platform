"use client";

import Button from "@/components/ui/Button";

interface ResultUIProps {
  toolName: string;
  heading?: string;
  fileName?: string;
  onDownload?: () => void;
  onReset: () => void;
}

export default function ResultUI({ toolName, heading, fileName, onDownload, onReset }: ResultUIProps) {
  const displayHeading = heading || `Processing Complete`;
  return (
    <div className="w-full py-8 text-center animate-scale-in" role="status" aria-live="polite">
      <div className="w-16 h-16 mx-auto rounded-full bg-success-light flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-foreground">{displayHeading}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Your file has been processed by {toolName}.
          {fileName && (
            <span className="block text-xs text-muted-foreground mt-1 font-mono truncate" title={fileName}>
              {fileName}
            </span>
          )}
      </p>

      <div className="flex items-center justify-center gap-3">
        <Button variant="secondary" onClick={onReset}>
          Process Another File
        </Button>
        {onDownload && (
          <Button onClick={onDownload} aria-label={`Download ${fileName || "result"}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download
          </Button>
        )}
      </div>
    </div>
  );
}
