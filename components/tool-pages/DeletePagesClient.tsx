"use client";

import { useState } from "react";
import ToolPage from "@/components/upload/ToolPage";
import PageSelector from "@/components/upload/PageSelector";
import { getToolById } from "@/lib/tools";
import { getPagePresets } from "@/lib/processing/page-utils";

const tool = getToolById("delete-pages");
const presets = getPagePresets();

export default function DeletePagesClient() {
  const [pages, setPages] = useState("");

  if (!tool) return null;

  return (
    <div className="pb-20">
      <ToolPage tool={tool} options={{ pages }} />
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-border p-4 z-40">
        <div className="max-w-3xl mx-auto w-80">
          <PageSelector
            label="Pages to Delete"
            value={pages}
            onChange={setPages}
            placeholder="e.g. 1-3, 5, 8-10"
            presets={presets}
            helpText="Specify the pages you want to remove"
          />
        </div>
      </div>
    </div>
  );
}
