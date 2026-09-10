"use client";

import { useState, useCallback, useRef } from "react";
import PageThumbnail from "./PageThumbnail";

interface ThumbnailGridProps {
  pages: Array<{ index: number; width: number; height: number }>;
  pdfBytes: Uint8Array;
  selection: Set<number>;
  clipboardPageIndices: number[];
  onSelect: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onContextMenu: (e: React.MouseEvent, pageIndex: number) => void;
}

export default function ThumbnailGrid({
  pages,
  pdfBytes,
  selection,
  clipboardPageIndices,
  onSelect,
  onReorder,
  onContextMenu,
}: ThumbnailGridProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === index) return;
      setDragOverIndex(index);
    },
    [dragIndex]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      if (dragIndex !== null && dragIndex !== toIndex) {
        onReorder(dragIndex, toIndex);
      }
      setDragIndex(null);
      setDragOverIndex(null);
    },
    [dragIndex, onReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4"
    >
      {pages.map((page) => (
        <div
          key={page.index}
          draggable
          onDragStart={(e) => handleDragStart(e, page.index)}
          onDragOver={(e) => handleDragOver(e, page.index)}
          onDrop={(e) => handleDrop(e, page.index)}
          onDragEnd={handleDragEnd}
          onContextMenu={(e) => {
            e.preventDefault();
            onContextMenu(e, page.index);
          }}
          className={`transition-all duration-150 ${
            dragOverIndex === page.index && dragIndex !== page.index
              ? "scale-95 opacity-60"
              : ""
          } ${dragIndex === page.index ? "opacity-40 scale-95" : ""}`}
        >
          <PageThumbnail
            pageIndex={page.index}
            pdfBytes={pdfBytes}
            width={page.width}
            height={page.height}
            isSelected={selection.has(page.index)}
            isCopied={clipboardPageIndices.includes(page.index)}
            onSelect={onSelect}
          />
        </div>
      ))}
    </div>
  );
}
