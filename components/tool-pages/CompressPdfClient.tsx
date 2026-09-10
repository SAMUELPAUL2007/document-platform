"use client";

import { useState } from "react";
import ToolPage from "@/components/upload/ToolPage";
import { getToolById } from "@/lib/tools";

const tool = getToolById("compress-pdf");

interface QualityOption {
  value: string;
  label: string;
  description: string;
}

const QUALITY_OPTIONS: QualityOption[] = [
  { value: "low", label: "Maximum Compression", description: "Smallest file size, removes metadata" },
  { value: "medium", label: "Balanced", description: "Good balance of size and quality" },
  { value: "high", label: "Maximum Quality", description: "Preserves metadata, larger file" },
];

export default function CompressPdfClient() {
  const [quality, setQuality] = useState("medium");

  if (!tool) return null;

  return (
    <div className="pb-20">
      <ToolPage tool={tool} options={{ quality }} />
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-border p-4 z-40">
        <div className="max-w-3xl mx-auto space-y-1.5">
          <span className="text-sm font-medium text-foreground">Compression Level</span>
          <div className="grid grid-cols-3 gap-2">
            {QUALITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setQuality(opt.value)}
                  aria-pressed={quality === opt.value}
                  className={`px-3 py-2 text-sm rounded-xl border transition-colors cursor-pointer ${
                    quality === opt.value
                      ? "border-primary bg-primary-light text-primary font-medium"
                      : "border-border bg-white text-muted-foreground hover:border-muted-foreground/30"
                  }`}
                >
                <span className="block font-medium">{opt.label}</span>
                <span className="block text-xs opacity-70">{opt.description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
