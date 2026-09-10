"use client";

import { useRef, useCallback } from "react";

interface WorkspaceDropZoneProps {
  onPdfLoaded: (bytes: Uint8Array, name: string) => void;
}

export default function WorkspaceDropZone({ onPdfLoaded }: WorkspaceDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.includes("pdf")) return;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const name = file.name.replace(/\.pdf$/i, "");
      onPdfLoaded(bytes, name);
    },
    [onPdfLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface flex items-center justify-center">
      <div
        className="max-w-xl w-full mx-4 p-12 rounded-3xl border-2 border-dashed border-border bg-white text-center cursor-pointer transition-all hover:border-primary hover:bg-primary-light"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-light flex items-center justify-center">
          <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          Open a PDF to start editing
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Drag & drop a PDF here, or click to browse
        </p>
        <div className="inline-flex items-center h-10 px-6 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary-hover transition-colors shadow-sm">
          Choose PDF
        </div>
      </div>
    </div>
  );
}
