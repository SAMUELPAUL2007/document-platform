"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import type { Presentation } from "@/lib/presentation/types";
import { createPresentation } from "@/lib/presentation/engine";
import { createDefaultSlide } from "@/lib/presentation/layouts";
import { importPptx } from "@/lib/presentation/import";
import Link from "next/link";

const SlideEditor = dynamic(() => import("@/components/presentation/SlideEditor"), { ssr: false });

export default function PresentationClient() {
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [view, setView] = useState<"landing" | "editor">("landing");
  const [importing, setImporting] = useState(false);

  const handleNewPresentation = useCallback(() => {
    const pres = createPresentation("Untitled Presentation");
    const slide = createDefaultSlide("title");
    pres.slides = [slide];
    setPresentation(pres);
    setView("editor");
  }, []);

  const handleImportFile = useCallback(async (file: File) => {
    setImporting(true);
    try {
      const pres = await importPptx(file);
      setPresentation(pres);
      setView("editor");
    } catch (err) {
      console.error("Failed to import:", err);
    } finally {
      setImporting(false);
    }
  }, []);

  const handleFileInput = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pptx,.ppt";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleImportFile(file);
    };
    input.click();
  }, [handleImportFile]);

  if (view === "editor" && presentation) {
    return <SlideEditor initialPresentation={presentation} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← Back to tools</Link>
        </div>

        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-2xl mb-4">
            <span className="text-3xl">📊</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Presentation Editor</h1>
          <p className="text-gray-500">Create professional presentations with a familiar slide-based editor</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <button
            onClick={handleNewPresentation}
            className="bg-white rounded-xl border border-gray-200 p-8 text-left hover:border-blue-400 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <span className="text-2xl">+</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">New Presentation</h3>
            <p className="text-sm text-gray-500">Start from a blank slide deck with theme options</p>
          </button>

          <button
            onClick={handleFileInput}
            disabled={importing}
            className="bg-white rounded-xl border border-gray-200 p-8 text-left hover:border-orange-400 hover:shadow-md transition-all group disabled:opacity-50"
          >
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors">
              <span className="text-2xl">📂</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{importing ? "Importing..." : "Import PPTX"}</h3>
            <p className="text-sm text-gray-500">Upload an existing PowerPoint file to edit</p>
          </button>
        </div>

        <div className="mt-16 bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Slide Management</h4>
              <p>Add, remove, duplicate, and reorder slides with multiple layout templates</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Rich Editing</h4>
              <p>Text formatting, shapes, images, tables with full property controls</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Export & Share</h4>
              <p>Export to PPTX or PDF, present in fullscreen, import existing files</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
