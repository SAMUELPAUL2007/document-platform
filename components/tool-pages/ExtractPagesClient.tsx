"use client";

import { useState } from "react";
import ToolPage from "@/components/upload/ToolPage";
import PageSelector from "@/components/upload/PageSelector";
import { getToolById } from "@/lib/tools";
import { getPagePresets } from "@/lib/processing/page-utils";

const tool = getToolById("extract-pages");
const presets = getPagePresets();

export default function ExtractPagesClient() {
  const [pages, setPages] = useState("");

  if (!tool) return null;

  const optionsPanel = (
    <PageSelector
      label="Pages to Extract"
      value={pages}
      onChange={setPages}
      placeholder="e.g. 1-3, 5, 8-10"
      presets={presets}
      helpText="Leave empty to extract all pages"
    />
  );

  return (
    <ToolPage tool={tool} options={{ pages }} optionsPanel={optionsPanel} optionsLabel="Page Selection" />
  );
}
