"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface PdfViewerProps {
  pdfBytes: Uint8Array;
  pageIndex: number;
}

export default function PdfViewer({ pdfBytes, pageIndex }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      setLoading(true);

      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes.buffer.slice(0)) }).promise;
      const page = await doc.getPage(pageIndex + 1);

      const containerWidth = container.clientWidth - 32;
      const baseViewport = page.getViewport({ scale: 1 });
      const fitScale = containerWidth / baseViewport.width;
      const viewport = page.getViewport({ scale: fitScale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport, canvas: canvas as unknown as HTMLCanvasElement }).promise;

      if (!cancelled) {
        setScale(fitScale);
        setLoading(false);
      }
    }

    render().catch(() => {});
    return () => { cancelled = true; };
  }, [pdfBytes, pageIndex]);

  const handleZoomIn = useCallback(() => {
    setScale((s) => Math.min(s + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((s) => Math.max(s - 0.25, 0.25));
  }, []);

  return (
    <div className="flex flex-col h-full bg-muted/30 rounded-xl overflow-hidden border border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-border">
        <span className="text-sm font-medium text-foreground">Page {pageIndex + 1}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5H6" />
            </svg>
          </button>
          <span className="text-xs text-muted-foreground min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5H6" />
            </svg>
          </button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-auto p-4 flex items-start justify-center">
        {loading && (
          <div className="w-full aspect-[0.707] skeleton rounded-lg" />
        )}
        <canvas
          ref={canvasRef}
          className={`shadow-lg rounded-lg transition-opacity ${loading ? "opacity-0 absolute" : "opacity-100"}`}
          style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
        />
      </div>
    </div>
  );
}
