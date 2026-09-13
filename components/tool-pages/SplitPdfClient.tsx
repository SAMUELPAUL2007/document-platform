"use client";

import { useState } from "react";
import ToolPage from "@/components/upload/ToolPage";
import { SplitModeSelector } from "@/components/upload/PageSelector";
import PageSelector from "@/components/upload/PageSelector";
import { getToolById } from "@/lib/tools";

const tool = getToolById("split-pdf");

export default function SplitPdfClient() {
  const [splitMode, setSplitMode] = useState("all");
  const [everyN, setEveryN] = useState("2");
  const [ranges, setRanges] = useState("");

  if (!tool) return null;

  const options: Record<string, string> = { splitMode };
  if (splitMode === "every") options.everyN = everyN;
  if (splitMode === "ranges") options.ranges = ranges;

  const optionsPanel = (
    <div className="space-y-3">
      <SplitModeSelector mode={splitMode} onModeChange={setSplitMode} />
      {splitMode === "every" && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Every</span>
          <label htmlFor="every-n-input" className="sr-only">Every N pages</label>
          <input
            id="every-n-input"
            type="number"
            min="1"
            max="50"
            value={everyN}
            onChange={(e) => setEveryN(e.target.value)}
            className="w-20 px-3 py-1.5 text-sm rounded-xl border border-border bg-white text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <span className="text-sm text-muted-foreground">pages</span>
        </div>
      )}
      {splitMode === "ranges" && (
        <PageSelector
          label="Page Ranges"
          value={ranges}
          onChange={setRanges}
          placeholder="e.g. 1-5, 8-10"
          helpText="Comma-separated page ranges"
        />
      )}
    </div>
  );

  return (
    <ToolPage tool={tool} options={options} optionsPanel={optionsPanel} optionsLabel="Split Settings" />
  );
}
