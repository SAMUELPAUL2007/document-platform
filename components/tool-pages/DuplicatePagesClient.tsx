"use client";

import { useState, useMemo } from "react";
import ToolPage from "@/components/upload/ToolPage";
import PageSelector, {
  DuplicateCountSelector,
} from "@/components/upload/PageSelector";
import { getToolById } from "@/lib/tools";
import { getPagePresets, parsePageSelection } from "@/lib/processing/page-utils";

const tool = getToolById("duplicate-pages");

export default function DuplicatePagesClient() {
  const [pages, setPages] = useState("");
  const [count, setCount] = useState("2");

  const selectedCount = useMemo(() => {
    if (!pages || pages.trim() === "") return 0;
    const parsed = parsePageSelection(pages, 999);
    return parsed.length;
  }, [pages]);

  const countNum = parseInt(count, 10) || 2;
  const isAllPages = !pages || pages.trim() === "";

  if (!tool) return null;

  const optionsPanel = (
    <div className="space-y-4">
      <PageSelector
        label="Pages to Duplicate"
        value={pages}
        onChange={setPages}
        placeholder="All pages"
        presets={getPagePresets()}
        helpText="Leave empty for all pages. Use numbers, commas, or ranges (e.g. 1-3, 5, 7)"
      />
      <DuplicateCountSelector value={count} onChange={setCount} />

      <div className="p-3 rounded-xl bg-muted/50 border border-border">
        <p className="text-sm text-foreground">
          {isAllPages ? (
            <span className="font-medium">All pages</span>
          ) : (
            <>
              <span className="font-medium">{selectedCount}</span> page{selectedCount !== 1 ? "s" : ""} selected
            </>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Output: <span className="font-medium text-foreground">{isAllPages ? "all pages" : selectedCount} × {countNum} = {(isAllPages ? 0 : selectedCount) * countNum || "all pages"}</span> pages
        </p>
      </div>
    </div>
  );

  return (
    <ToolPage tool={tool} options={{ pages, count }} optionsPanel={optionsPanel} optionsLabel="Duplicate Settings" />
  );
}
