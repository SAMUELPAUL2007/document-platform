"use client";

import { useState, useEffect, useRef } from "react";
import { formatFileSize, getFileExtension } from "@/lib/file-utils";

interface FileCardProps {
  file: File;
  onRemove?: () => void;
  status?: "pending" | "uploading" | "processing" | "complete" | "error";
  progress?: number;
}

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp"]);

const extColors: Record<string, string> = {
  pdf: "bg-red-100 text-red-600",
  doc: "bg-blue-100 text-blue-600",
  docx: "bg-blue-100 text-blue-600",
  jpg: "bg-green-100 text-green-600",
  jpeg: "bg-green-100 text-green-600",
  png: "bg-purple-100 text-purple-600",
  webp: "bg-purple-100 text-purple-600",
  ppt: "bg-orange-100 text-orange-600",
  pptx: "bg-orange-100 text-orange-600",
};

const statusConfig = {
  pending: { label: "Ready", color: "text-muted-foreground" },
  uploading: { label: "Uploading", color: "text-primary" },
  processing: { label: "Processing", color: "text-accent" },
  complete: { label: "Done", color: "text-success" },
  error: { label: "Failed", color: "text-danger bg-danger/10 border border-danger" },
};

function ImageThumbnail({ file }: { file: File }) {
  const [src, setSrc] = useState<string | null>(null);
  const srcRef = useRef<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    srcRef.current = url;
    setSrc(url);
    return () => {
      if (srcRef.current) {
        URL.revokeObjectURL(srcRef.current);
        srcRef.current = null;
      }
    };
  }, [file]);

  if (!src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- blob URLs from createObjectURL are not supported by next/image
    <img
      src={src}
      alt={`Preview of ${file.name}`}
      className="w-10 h-10 rounded-lg object-cover shrink-0"
    />
  );
}

export default function FileCard({
  file,
  onRemove,
  status = "pending",
  progress = 0,
}: FileCardProps) {
  const ext = getFileExtension(file.name);
  const colorClass = extColors[ext] || "bg-muted text-muted-foreground";
  const statusInfo = statusConfig[status];
  const isImage = IMAGE_EXTENSIONS.has(ext);

  return (
    <div className={`group flex items-center gap-3 p-3 rounded-xl border ${status === "error" ? "border-danger bg-danger/5" : "border-border"} bg-white hover:shadow-sm transition-all duration-150`}>
      {isImage ? (
        <ImageThumbnail file={file} />
      ) : (
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold uppercase shrink-0 ${colorClass}`}
        >
          {ext}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
          <span className="text-xs text-muted-foreground">&middot;</span>
          <span className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
        </div>
        {(status === "uploading" || status === "processing") && (
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`File ${status === "uploading" ? "upload" : "processing"} progress`}
            />
          </div>
        )}
      </div>

      {status === "complete" && (
        <div className="w-8 h-8 rounded-full bg-success-light flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
      )}

      {onRemove && status === "pending" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="w-8 h-8 rounded-lg hover:bg-danger/10 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          aria-label={`Remove ${file.name}`}
        >
          <svg className="w-4 h-4 text-muted-foreground hover:text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      )}
    </div>
  );
}
