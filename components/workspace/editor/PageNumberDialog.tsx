"use client";

import React, { useState } from "react";

interface PageNumberDialogProps {
  open: boolean;
  onClose: () => void;
  onInsert: (config: PageNumberConfig) => void;
}

export interface PageNumberConfig {
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  format: "page" | "page-total" | "page-of-total";
}

export function PageNumberDialog({ open, onClose, onInsert }: PageNumberDialogProps) {
  const [config, setConfig] = useState<PageNumberConfig>({
    text: "{page}",
    fontFamily: "Helvetica",
    fontSize: 12,
    color: "#000000",
    format: "page",
  });

  const handleFormatChange = (format: PageNumberConfig["format"]) => {
    const textMap = {
      page: "{page}",
      "page-total": "{page}/{total}",
      "page-of-total": "{page} of {total}",
    };
    setConfig({ ...config, format, text: textMap[format] });
  };

  const handleInsert = () => {
    onInsert(config);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[380px] max-w-[90vw]">
        <h3 className="text-lg font-semibold mb-4">Add Page Numbers</h3>
        <div className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Format</span>
            <div className="flex gap-2">
              {([
                ["page", "Page #"],
                ["page-total", "# / Total"],
                ["page-of-total", "# of Total"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => handleFormatChange(value)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border ${
                    config.format === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Font</span>
              <select
                value={config.fontFamily}
                onChange={(e) => setConfig({ ...config, fontFamily: e.target.value })}
                className="border border-border rounded-lg px-3 py-2 text-sm"
              >
                <option value="Helvetica">Helvetica</option>
                <option value="Times-Roman">Times</option>
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
                min={6}
                max={72}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Color</span>
              <input
                type="color"
                value={config.color}
                onChange={(e) => setConfig({ ...config, color: e.target.value })}
                className="w-full h-9 cursor-pointer rounded border border-border"
              />
            </label>
          </div>
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
            Preview: {config.text
              .replace("{page}", "1")
              .replace("{total}", "10")}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={handleInsert}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover"
          >
            Add Page Numbers
          </button>
        </div>
      </div>
    </div>
  );
}
