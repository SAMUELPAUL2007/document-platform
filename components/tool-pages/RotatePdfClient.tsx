"use client";

import { useState } from "react";
import ToolPage from "@/components/upload/ToolPage";
import PageSelector from "@/components/upload/PageSelector";
import { getToolById } from "@/lib/tools";
import { getPagePresets } from "@/lib/processing/page-utils";

const tool = getToolById("rotate-pdf");
const presets = getPagePresets();

export default function RotatePdfClient() {
  const [rotation, setRotation] = useState("90");
  const [pages, setPages] = useState("");

  if (!tool) return null;

  return (
    <div className="pb-20">
      <ToolPage tool={tool} options={{ rotation, pages }} />
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-border p-4 z-40">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-end gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">Rotate:</span>
            <div className="flex gap-2">
              {[
                { value: "90", label: "90°" },
                { value: "180", label: "180°" },
                { value: "270", label: "270°" },
              ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setRotation(opt.value)}
                    aria-pressed={rotation === opt.value}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer ${
                      rotation === opt.value
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full sm:w-80">
            <PageSelector
              label="Pages to Rotate"
              value={pages}
              onChange={setPages}
              placeholder="All pages"
              presets={presets}
              helpText="Leave empty to rotate all pages"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
