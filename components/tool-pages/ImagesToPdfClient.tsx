"use client";

import { useState } from "react";
import ToolPage from "@/components/upload/ToolPage";
import { getToolById } from "@/lib/tools";

const tool = getToolById("images-to-pdf");

interface FitOption {
  value: string;
  label: string;
  description: string;
}

const FIT_OPTIONS: FitOption[] = [
  { value: "contain", label: "Fit", description: "Full image, may leave borders" },
  { value: "cover", label: "Fill", description: "Fill page, may crop edges" },
  { value: "fill", label: "Stretch", description: "Stretch to fill exactly" },
];

const MARGIN_PRESETS = [
  { value: "0", label: "None" },
  { value: "36", label: "Small" },
  { value: "72", label: "Medium" },
];

export default function ImagesToPdfClient() {
  const [pageSize, setPageSize] = useState("a4");
  const [fit, setFit] = useState("contain");
  const [margin, setMargin] = useState("36");

  if (!tool) return null;

  const optionsPanel = (
    <div className="space-y-4">
      <div>
        <span className="text-sm font-medium text-foreground block mb-2">Page Size</span>
        <div className="flex gap-1">
          {[
            { value: "a4", label: "A4" },
            { value: "letter", label: "Letter" },
            { value: "original", label: "Original" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPageSize(opt.value)}
              aria-pressed={pageSize === opt.value}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer ${
                pageSize === opt.value
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="text-sm font-medium text-foreground block mb-2">Fit</span>
        <div className="flex gap-1">
          {FIT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFit(opt.value)}
              title={opt.description}
              aria-pressed={fit === opt.value}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer ${
                fit === opt.value
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="text-sm font-medium text-foreground block mb-2">Margins</span>
        <div className="flex gap-1">
          {MARGIN_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => setMargin(preset.value)}
              aria-pressed={margin === preset.value}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer ${
                margin === preset.value
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <ToolPage tool={tool} options={{ pageSize, fit, margin }} optionsPanel={optionsPanel} optionsLabel="Page Settings" />
  );
}
