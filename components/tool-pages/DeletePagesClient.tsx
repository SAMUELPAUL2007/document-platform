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

  const optionsPanel = (
    <PageSelector
      label="Pages to Delete"
      value={pages}
      onChange={setPages}
      placeholder="e.g. 1-3, 5, 8-10"
      presets={presets}
      helpText="Specify the pages you want to remove"
    />
  );

  return (
    <ToolPage tool={tool} options={{ pages }} optionsPanel={optionsPanel} optionsLabel="Page Selection" />
  );
}
