"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";

interface SignatureDialogProps {
  open: boolean;
  onClose: () => void;
  onInsert: (bytes: Uint8Array) => void;
}

export function SignatureDialog({ open, onClose, onInsert }: SignatureDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (open && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, 400, 150);
      }
    }
  }, [open]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    setHasDrawn(true);
  };

  const handleMouseUp = () => setIsDrawing(false);

  const handleClear = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 400, 150);
    }
    setHasDrawn(false);
  };

  const handleInsert = async () => {
    if (!canvasRef.current || !hasDrawn) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const resp = await fetch(dataUrl);
    const blob = await resp.blob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    onInsert(bytes);
    handleClose();
  };

  const handleClose = () => {
    handleClear();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[460px] max-w-[90vw]">
        <h3 className="text-lg font-semibold mb-4">Draw Signature</h3>
        <div className="border border-border rounded-lg overflow-hidden mb-4">
          <canvas
            ref={canvasRef}
            width={400}
            height={150}
            className="cursor-crosshair block"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
        <div className="flex justify-between">
          <button onClick={handleClear} className="px-3 py-1.5 text-sm rounded-lg hover:bg-muted">
            Clear
          </button>
          <div className="flex gap-2">
            <button onClick={handleClose} className="px-4 py-2 text-sm rounded-lg hover:bg-muted">
              Cancel
            </button>
            <button
              onClick={handleInsert}
              disabled={!hasDrawn}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
            >
              Insert Signature
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
