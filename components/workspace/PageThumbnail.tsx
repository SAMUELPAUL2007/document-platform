"use client";

import { useRef, useEffect, useState } from "react";

interface PageThumbnailProps {
  pageIndex: number;
  pdfBytes: Uint8Array;
  width: number;
  height: number;
  isSelected: boolean;
  isCopied: boolean;
  onSelect: (index: number) => void;
  onRendered?: (pageIndex: number, dataUrl: string) => void;
}

export default function PageThumbnail({
  pageIndex,
  pdfBytes,
  width,
  height,
  isSelected,
  isCopied,
  onSelect,
  onRendered,
}: PageThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes.buffer.slice(0)) }).promise;
      const page = await doc.getPage(pageIndex + 1);

      const scale = 120 / page.getViewport({ scale: 1 }).width;
      const viewport = page.getViewport({ scale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport, canvas: canvas as unknown as HTMLCanvasElement }).promise;

      if (!cancelled) {
        setLoaded(true);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
        onRendered?.(pageIndex, dataUrl);
      }
    }

    render().catch(() => {});
    return () => { cancelled = true; };
  }, [pageIndex, pdfBytes, onRendered]);

  const aspectRatio = height / width;

  return (
    <button
      onClick={() => onSelect(pageIndex)}
      className={`group relative rounded-xl overflow-hidden border-2 transition-all duration-150 cursor-pointer
        ${isSelected ? "border-primary shadow-md ring-2 ring-primary/20 scale-[1.02]" : "border-border hover:border-primary/40 hover:shadow-sm"}
        ${isCopied ? "ring-2 ring-accent/40" : ""}`}
    >
      <div className="bg-white p-1.5">
        <div
          className="relative w-full bg-white rounded-lg overflow-hidden"
          style={{ paddingBottom: `${aspectRatio * 100}%` }}
        >
          {!loaded && (
            <div className="absolute inset-0 skeleton" />
          )}
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full object-contain transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
          />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-1.5">
        <span className="text-xs font-medium text-white drop-shadow-sm">
          {pageIndex + 1}
        </span>
      </div>
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  );
}
