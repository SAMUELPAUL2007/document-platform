"use client";

import { useState } from "react";
import ToolPage from "@/components/upload/ToolPage";
import PageSelector, {
  DuplicateCountSelector,
} from "@/components/upload/PageSelector";
import { getToolById } from "@/lib/tools";
import { getPagePresets } from "@/lib/processing/page-utils";

const tool = getToolById("duplicate-pages");
const presets = getPagePresets();

export default function DuplicatePagesClient() {
  const [pages, setPages] = useState("");
  const [count, setCount] = useState("2");

  if (!tool) return null;

  return (
    <div className="pb-20">
      <ToolPage tool={tool} options={{ pages, count }} />
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-border p-4 z-40">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-end gap-4 sm:gap-6">
          <div className="w-full sm:w-64">
            <PageSelector
              label="Pages to Duplicate"
              value={pages}
              onChange={setPages}
              placeholder="All pages"
              presets={presets}
              helpText="Leave empty for all pages"
            />
          </div>
          <div className="w-full sm:w-auto">
            <DuplicateCountSelector value={count} onChange={setCount} />
          </div>
        </div>
      </div>
    </div>
  );
}
