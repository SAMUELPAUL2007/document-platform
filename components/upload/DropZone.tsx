"use client";

import { useCallback, useRef, useState } from "react";
import { isAcceptedFile, MAX_FILE_SIZE } from "@/lib/file-utils";
import { formatFileSize } from "@/lib/file-utils";

interface DropZoneProps {
  accept: string;
  maxFiles?: number;
  onFilesSelected: (files: File[]) => void;
  compact?: boolean;
}

export default function DropZone({
  accept,
  maxFiles = 10,
  onFilesSelected,
  compact = false,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const validateFiles = useCallback(
    (files: FileList | File[]) => {
      setError(null);
      const fileArray = Array.from(files);

      if (fileArray.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const invalid = fileArray.find((f) => !isAcceptedFile(f, accept));
      if (invalid) {
        setError(`"${invalid.name}" is not a supported file type`);
        return;
      }

      const oversized = fileArray.find((f) => f.size > MAX_FILE_SIZE);
      if (oversized) {
        setError(`"${oversized.name}" exceeds the ${formatFileSize(MAX_FILE_SIZE)} limit`);
        return;
      }

      onFilesSelected(fileArray);
    },
    [accept, maxFiles, onFilesSelected]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        validateFiles(e.dataTransfer.files);
      }
    },
    [validateFiles]
  );

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateFiles(e.target.files);
      e.target.value = "";
    }
  };

  if (compact) {
    return (
      <div className="w-full">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleChange}
          className="sr-only"
          aria-label="Add more files"
          id="add-more-files"
        />
        <label
          htmlFor="add-more-files"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary/40 rounded-lg cursor-pointer transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add another file
        </label>
        {error && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-danger-light text-red-700 text-xs flex items-center gap-2 animate-fade-in" role="alert" aria-live="assertive">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Drop files here or click to browse"
        aria-describedby="dropzone-hint"
        className={`relative w-full border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200
          ${
            isDragging
              ? "border-primary bg-primary-light scale-[1.01]"
              : "border-border hover:border-primary/40 hover:bg-surface"
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleChange}
          className="sr-only"
          aria-label="Upload files"
        />

        <div className="flex flex-col items-center gap-4">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-200
              ${isDragging ? "bg-primary text-white" : "bg-primary-light text-primary"}`}
          >
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
              />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">
              {isDragging ? "Drop your files here" : "Drag & drop files here"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or{" "}
              <span className="text-primary font-medium">browse files</span>{" "}
              from your computer
            </p>
          </div>
<p className="text-xs text-muted-foreground" id="dropzone-hint">
              Supports {accept.replace(/\./g, "").toUpperCase().replace(/,/g, ", ")} up to {formatFileSize(MAX_FILE_SIZE)}
              {maxFiles > 1 ? ` (max ${maxFiles} files)` : ""}
            </p>
        </div>
      </div>

      {error && (
        <div className="mt-3 px-4 py-2.5 rounded-xl bg-danger-light text-red-700 text-sm flex items-center gap-2 animate-fade-in" role="alert" aria-live="assertive">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}
