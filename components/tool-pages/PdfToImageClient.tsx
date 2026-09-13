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

  const optionsPanel = (
    <div className="space-y-4">
      <div>
        <span className="text-sm font-medium text-foreground block mb-2">Quality</span>
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
      <PageSelector
        label="Pages"
        value={pages}
        onChange={setPages}
        placeholder="All pages"
        presets={presets}
        helpText="Leave empty for all pages"
      />
    </div>
  );

  return (
    <ToolPage tool={tool} options={{ scale, pages }} optionsPanel={optionsPanel} optionsLabel="Image Settings" />
  );
}
