"use client";

import { useState } from "react";
import ToolPage from "@/components/upload/ToolPage";
import PageSelector from "@/components/upload/PageSelector";
import { getToolById } from "@/lib/tools";
import { getPagePresets } from "@/lib/processing/page-utils";

interface PdfToImageClientProps {
  toolId: string;
}

const presets = getPagePresets();

export default function PdfToImageClient({ toolId }: PdfToImageClientProps) {
  const [scale, setScale] = useState("2");
  const [pages, setPages] = useState("");

  const tool = getToolById(toolId);
  if (!tool) return null;

  return (
    <div className="pb-20">
      <ToolPage tool={tool} options={{ scale, pages }} />
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-border p-4 z-40">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Quality:</span>
            <div className="flex gap-1">
              {[
                { value: "1", label: "Low" },
                { value: "2", label: "High" },
                { value: "3", label: "Ultra" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setScale(opt.value)}
                  aria-pressed={scale === opt.value}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer ${
                    scale === opt.value
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full sm:w-64">
            <PageSelector
              label="Pages"
              value={pages}
              onChange={setPages}
              placeholder="All pages"
              presets={presets}
              helpText="Leave empty for all pages"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
