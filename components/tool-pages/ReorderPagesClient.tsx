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

  return (
    <div className="pb-20">
      <ToolPage tool={tool} options={{ order }} />
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-border p-4 z-40">
        <div className="max-w-3xl mx-auto w-80">
          <PageSelector
            label="New Page Order"
            value={order}
            onChange={setOrder}
            placeholder="e.g. 3, 1, 2, 5, 4"
            presets={REORDER_PRESETS}
            helpText="Comma-separated page numbers in desired order"
          />
        </div>
      </div>
    </div>
  );
}
