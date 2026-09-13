"use client";

import { useState } from "react";
import ToolPage from "@/components/upload/ToolPage";
import PageSelector from "@/components/upload/PageSelector";
import { getToolById } from "@/lib/tools";

const tool = getToolById("reorder-pages");

const REORDER_PRESETS = [
  { label: "Reverse", value: "reverse" },
];

export default function ReorderPagesClient() {
  const [order, setOrder] = useState("");

  if (!tool) return null;

  const optionsPanel = (
    <PageSelector
      label="New Page Order"
      value={order}
      onChange={setOrder}
      placeholder="e.g. 3, 1, 2, 5, 4"
      presets={REORDER_PRESETS}
      helpText="Comma-separated page numbers in desired order"
    />
  );

  return (
    <ToolPage tool={tool} options={{ order }} optionsPanel={optionsPanel} optionsLabel="Page Order" />
  );
}
