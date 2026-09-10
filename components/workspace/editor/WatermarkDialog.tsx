"use client";

import React, { useState } from "react";

interface WatermarkDialogProps {
  open: boolean;
  onClose: () => void;
  onInsert: (config: WatermarkConfig) => void;
}

export interface WatermarkConfig {
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  opacity: number;
  rotation: number;
}

export function WatermarkDialog({ open, onClose, onInsert }: WatermarkDialogProps) {
  const [config, setConfig] = useState<WatermarkConfig>({
    text: "WATERMARK",
    fontFamily: "Helvetica",
    fontSize: 48,
    color: "#cccccc",
    opacity: 0.15,
    rotation: -45,
  });

  const handleInsert = () => {
    onInsert(config);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[400px] max-w-[90vw]">
        <h3 className="text-lg font-semibold mb-4">Add Text Watermark</h3>
        <div className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Text</span>
            <input
              type="text"
              value={config.text}
              onChange={(e) => setConfig({ ...config, text: e.target.value })}
              className="border border-border rounded-lg px-3 py-2 text-sm"
              placeholder="WATERMARK"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Font</span>
              <select
                value={config.fontFamily}
                onChange={(e) => setConfig({ ...config, fontFamily: e.target.value })}
                className="border border-border rounded-lg px-3 py-2 text-sm"
              >
                <option value="Helvetica">Helvetica</option>
                <option value="Times-Roman">Times Roman</option>
                <option value="Courier">Courier</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Size</span>
              <input
                type="number"
                value={config.fontSize}
                onChange={(e) => setConfig({ ...config, fontSize: Number(e.target.value) })}
                className="border border-border rounded-lg px-3 py-2 text-sm"
                min={8}
                max={200}
              />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Color</span>
              <input
                type="color"
                value={config.color}
                onChange={(e) => setConfig({ ...config, color: e.target.value })}
                className="w-full h-9 cursor-pointer rounded border border-border"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Opacity</span>
              <input
                type="range"
                min={0.05}
                max={0.5}
                step={0.05}
                value={config.opacity}
                onChange={(e) => setConfig({ ...config, opacity: Number(e.target.value) })}
                className="w-full mt-2"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Rotation</span>
              <input
                type="number"
                value={config.rotation}
                onChange={(e) => setConfig({ ...config, rotation: Number(e.target.value) })}
                className="border border-border rounded-lg px-3 py-2 text-sm"
                min={-180}
                max={180}
              />
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={!config.text.trim()}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
          >
            Add Watermark
          </button>
        </div>
      </div>
    </div>
  );
}
