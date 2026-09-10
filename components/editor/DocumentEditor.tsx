"use client";

import { useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Typography from "@tiptap/extension-typography";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import FontFamily from "@tiptap/extension-font-family";
import { RibbonToolbar } from "./RibbonToolbar";
import { importDocx, exportDocx } from "@/lib/editor/docx-io";
import { exportPdf } from "@/lib/editor/pdf-export";
import type { RibbonTab, EditorSettings } from "@/lib/editor/types";

interface DocumentEditorProps {
  initialHtml?: string;
  title?: string;
}

export function DocumentEditor({ initialHtml = "", title = "" }: DocumentEditorProps) {
  const [activeTab, setActiveTab] = useState<RibbonTab>("home");
  const [docTitle, setDocTitle] = useState(title || "Untitled Document");
  const [isSaved, setIsSaved] = useState(true);
  const [settings, setSettings] = useState<EditorSettings>({
    zoom: 100,
    showRuler: true,
    showNavigation: true,
    showPageNumbers: true,
    pageSize: "a4",
    orientation: "portrait",
    fontFamily: "Arial",
    fontSize: 12,
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Highlight,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({ placeholder: "Start typing your document..." }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Typography,
      HorizontalRule,
      TextStyle,
      Color,
      Subscript,
      Superscript,
      FontFamily,
    ],
    content: initialHtml || "<p></p>",
    onUpdate: () => setIsSaved(false),
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[600px] px-8 py-6",
        style: "max-width: 210mm; min-height: 297mm; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);",
      },
    },
  });

  const handleFileOpen = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".docx,.doc";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await importDocx(bytes);
      if (editor && !result.error) {
        editor.commands.setContent(result.html);
        setDocTitle(result.title || file.name.replace(/\.(docx?|doc)$/, ""));
        setIsSaved(true);
      }
    };
    input.click();
  }, [editor]);

  const handleSaveDocx = useCallback(async () => {
    if (!editor) return;
    const html = editor.getHTML();
    const bytes = await exportDocx(html, { title: docTitle });
    const buf = new ArrayBuffer(bytes.length);
    new Uint8Array(buf).set(bytes);
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docTitle || "document"}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    setIsSaved(true);
  }, [editor, docTitle]);

  const handleExportPdf = useCallback(async () => {
    if (!editor) return;
    const html = editor.getHTML();
    const bytes = await exportPdf(html, { pageSize: settings.pageSize });
    const buf = new ArrayBuffer(bytes.length);
    new Uint8Array(buf).set(bytes);
    const blob = new Blob([buf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docTitle || "document"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [editor, docTitle, settings.pageSize]);

  const handleNewDocument = useCallback(() => {
    if (!editor) return;
    if (!isSaved && !window.confirm("Unsaved changes will be lost. Continue?")) return;
    editor.commands.setContent("<p></p>");
    setDocTitle("Untitled Document");
    setIsSaved(true);
  }, [editor, isSaved]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <RibbonToolbar
        editor={editor}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onFileOpen={handleFileOpen}
        onSave={handleSaveDocx}
        onExportPdf={handleExportPdf}
        onNewDocument={handleNewDocument}
        onPrint={handlePrint}
        settings={settings}
        onSettingsChange={setSettings}
      />

      <div className="flex items-center justify-between px-4 py-1 bg-white border-b border-gray-200">
        <input
          type="text"
          value={docTitle}
          onChange={(e) => {
            setDocTitle(e.target.value);
            setIsSaved(false);
          }}
          className="text-sm font-medium bg-transparent border-none outline-none focus:ring-0 px-2 py-1 w-64"
        />
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{isSaved ? "Saved" : "Unsaved changes"}</span>
          <span>Zoom: {settings.zoom}%</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8 flex justify-center" style={{ background: "#e5e5e5" }}>
        <div
          className="bg-white shadow-lg"
          style={{
            width: settings.orientation === "portrait" ? "210mm" : "297mm",
            minHeight: settings.orientation === "portrait" ? "297mm" : "210mm",
            transform: `scale(${settings.zoom / 100})`,
            transformOrigin: "top center",
          }}
        >
          <EditorContent editor={editor} className="prose max-w-none" />
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-1 bg-white border-t border-gray-200 text-xs text-gray-500">
        <span>Page 1 of 1</span>
        <span>{editor.storage.characterCount?.words?.() ?? editor.getText().split(/\s+/).filter(Boolean).length} words</span>
        <span>{editor.storage.characterCount?.characters?.() ?? editor.getText().length} characters</span>
      </div>
    </div>
  );
}
