"use client";

import type { Editor } from "@tiptap/react";
import type { RibbonTab, EditorSettings } from "@/lib/editor/types";

interface RibbonToolbarProps {
  editor: Editor;
  activeTab: RibbonTab;
  onTabChange: (tab: RibbonTab) => void;
  onFileOpen: () => void;
  onSave: () => void;
  onExportPdf: () => void;
  onNewDocument: () => void;
  onPrint: () => void;
  settings: EditorSettings;
  onSettingsChange: (settings: EditorSettings) => void;
}

const TABS: { id: RibbonTab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "insert", label: "Insert" },
  { id: "layout", label: "Layout" },
  { id: "references", label: "References" },
  { id: "review", label: "Review" },
  { id: "view", label: "View" },
];

const FONT_FAMILIES = [
  "Arial",
  "Times New Roman",
  "Courier New",
  "Georgia",
  "Verdana",
  "Helvetica",
  "Calibri",
  "Cambria",
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

export function RibbonToolbar({
  editor,
  activeTab,
  onTabChange,
  onFileOpen,
  onSave,
  onExportPdf,
  onNewDocument,
  onPrint,
  settings,
  onSettingsChange,
}: RibbonToolbarProps) {
  return (
    <div className="bg-white border-b border-gray-200 select-none">
      <div className="flex items-center border-b border-gray-100">
        <div className="flex items-center gap-1 px-2 py-1">
          <button
            onClick={onNewDocument}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
            title="New Document"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <button
            onClick={onFileOpen}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
            title="Open DOCX"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </button>
          <button
            onClick={onSave}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
            title="Save DOCX"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          </button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-30"
            title="Undo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" />
            </svg>
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-30"
            title="Redo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4" />
            </svg>
          </button>
        </div>

        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1 px-2">
          <button
            onClick={onExportPdf}
            className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
          >
            Export PDF
          </button>
          <button
            onClick={onPrint}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Print
          </button>
        </div>
      </div>

      <div className="px-2 py-1">
        {activeTab === "home" && (
          <HomeTab editor={editor} settings={settings} onSettingsChange={onSettingsChange} />
        )}
        {activeTab === "insert" && <InsertTab editor={editor} />}
        {activeTab === "layout" && (
          <LayoutTab settings={settings} onSettingsChange={onSettingsChange} />
        )}
        {activeTab === "references" && <ReferencesTab editor={editor} />}
        {activeTab === "review" && <ReviewTab editor={editor} />}
        {activeTab === "view" && (
          <ViewTab settings={settings} onSettingsChange={onSettingsChange} />
        )}
      </div>
    </div>
  );
}

function HomeTab({
  editor,
  settings,
  onSettingsChange,
}: {
  editor: Editor;
  settings: EditorSettings;
  onSettingsChange: (s: EditorSettings) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex flex-col gap-1">
        <select
          value={settings.fontFamily}
          onChange={(e) => {
            onSettingsChange({ ...settings, fontFamily: e.target.value });
            editor.chain().focus().setFontFamily(e.target.value).run();
          }}
          className="text-xs border border-gray-200 rounded px-2 py-1 w-32"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <select
          value={settings.fontSize}
          onChange={(e) => {
            const size = Number(e.target.value);
            onSettingsChange({ ...settings, fontSize: size });
          }}
          className="text-xs border border-gray-200 rounded px-2 py-1 w-14"
        >
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="w-px h-6 bg-gray-200" />

      <div className="flex items-center gap-0.5">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded text-xs font-bold ${editor.isActive("bold") ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"}`}
          title="Bold"
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded text-xs italic ${editor.isActive("italic") ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"}`}
          title="Italic"
        >
          I
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded text-xs underline ${editor.isActive("underline") ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"}`}
          title="Underline"
        >
          U
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded text-xs line-through ${editor.isActive("strike") ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"}`}
          title="Strikethrough"
        >
          S
        </button>
        <button
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          className={`p-1.5 rounded text-xs ${editor.isActive("subscript") ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"}`}
          title="Subscript"
        >
          X₂
        </button>
        <button
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          className={`p-1.5 rounded text-xs ${editor.isActive("superscript") ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"}`}
          title="Superscript"
        >
          X²
        </button>
      </div>

      <div className="w-px h-6 bg-gray-200" />

      <div className="flex items-center gap-0.5">
        <input
          type="color"
          defaultValue="#000000"
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          className="w-6 h-6 rounded cursor-pointer border border-gray-200"
          title="Text Color"
        />
        <input
          type="color"
          defaultValue="#ffffff"
          onChange={(e) => editor.chain().focus().setHighlight({ color: e.target.value }).run()}
          className="w-6 h-6 rounded cursor-pointer border border-gray-200"
          title="Highlight Color"
        />
      </div>

      <div className="w-px h-6 bg-gray-200" />

      <div className="flex items-center gap-0.5">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1.5 rounded text-xs font-bold ${editor.isActive("heading", { level: 1 }) ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"}`}
          title="Heading 1"
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded text-xs font-bold ${editor.isActive("heading", { level: 2 }) ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"}`}
          title="Heading 2"
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-1.5 rounded text-xs font-bold ${editor.isActive("heading", { level: 3 }) ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"}`}
          title="Heading 3"
        >
          H3
        </button>
      </div>

      <div className="w-px h-6 bg-gray-200" />

      <div className="flex items-center gap-0.5">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded text-xs ${editor.isActive("bulletList") ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"}`}
          title="Bullet List"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded text-xs ${editor.isActive("orderedList") ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"}`}
          title="Numbered List"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h13M7 12h13M7 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={`p-1.5 rounded text-xs ${editor.isActive("taskList") ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"}`}
          title="Task List"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </button>
      </div>

      <div className="w-px h-6 bg-gray-200" />

      <div className="flex items-center gap-0.5">
        <button
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={`p-1.5 rounded text-xs ${editor.isActive({ textAlign: "left" }) ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"}`}
          title="Align Left"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M3 12h12M3 18h16" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={`p-1.5 rounded text-xs ${editor.isActive({ textAlign: "center" }) ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"}`}
          title="Align Center"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M6 12h12M3 18h18" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={`p-1.5 rounded text-xs ${editor.isActive({ textAlign: "right" }) ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"}`}
          title="Align Right"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M9 12h12M5 18h16" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          className={`p-1.5 rounded text-xs ${editor.isActive({ textAlign: "justify" }) ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"}`}
          title="Justify"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
      </div>

      <div className="w-px h-6 bg-gray-200" />

      <div className="flex items-center gap-0.5">
        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-1.5 rounded text-xs hover:bg-gray-100"
          title="Horizontal Rule"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={() => {
            const url = window.prompt("Enter URL:");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          className={`p-1.5 rounded text-xs ${editor.isActive("link") ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"}`}
          title="Insert Link"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function InsertTab({ editor }: { editor: Editor }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => {
          const url = window.prompt("Enter image URL:");
          if (url) editor.chain().focus().setImage({ src: url }).run();
        }}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-100"
        title="Insert Image"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Image
      </button>

      <button
        onClick={() => {
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run();
        }}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-100"
        title="Insert Table"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h18M3 18h18" />
        </svg>
        Table
      </button>

      <button
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-100"
        title="Insert Horizontal Rule"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
        Line
      </button>

      <button
        onClick={() => {
          const url = window.prompt("Enter link URL:");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-100"
        title="Insert Link"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        Link
      </button>
    </div>
  );
}

function LayoutTab({
  settings,
  onSettingsChange,
}: {
  settings: EditorSettings;
  onSettingsChange: (s: EditorSettings) => void;
}) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-600">Page Size:</label>
        <select
          value={settings.pageSize}
          onChange={(e) =>
            onSettingsChange({ ...settings, pageSize: e.target.value as "a4" | "letter" | "legal" })
          }
          className="text-xs border border-gray-200 rounded px-2 py-1"
        >
          <option value="a4">A4</option>
          <option value="letter">Letter</option>
          <option value="legal">Legal</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-600">Orientation:</label>
        <select
          value={settings.orientation}
          onChange={(e) =>
            onSettingsChange({ ...settings, orientation: e.target.value as "portrait" | "landscape" })
          }
          className="text-xs border border-gray-200 rounded px-2 py-1"
        >
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-600">Margins:</label>
        <span className="text-xs text-gray-500">1 inch (72pt)</span>
      </div>
    </div>
  );
}

function ReferencesTab({ editor }: { editor: Editor }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => {
          const url = window.prompt("Enter link URL:");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-100"
        title="Insert Link"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        Hyperlink
      </button>
      <span className="text-xs text-gray-400">Footnotes and citations coming soon</span>
    </div>
  );
}

function ReviewTab({ editor }: { editor: Editor }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => {
          const text = editor.getText();
          const words = text.split(/\s+/).filter(Boolean).length;
          const chars = text.length;
          const sentences = text.split(/[.!?]+/).filter(Boolean).length;
          const paragraphs = text.split(/\n\n+/).filter(Boolean).length;
          alert(
            `Document Statistics:\n\nWords: ${words}\nCharacters: ${chars}\nSentences: ${sentences}\nParagraphs: ${paragraphs}`
          );
        }}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-100"
        title="Word Count"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Word Count
      </button>
      <span className="text-xs text-gray-400">Track changes coming soon</span>
    </div>
  );
}

function ViewTab({
  settings,
  onSettingsChange,
}: {
  settings: EditorSettings;
  onSettingsChange: (s: EditorSettings) => void;
}) {
  const zoomLevels = [50, 75, 100, 125, 150, 200];

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-600">Zoom:</label>
        <select
          value={settings.zoom}
          onChange={(e) => onSettingsChange({ ...settings, zoom: Number(e.target.value) })}
          className="text-xs border border-gray-200 rounded px-2 py-1"
        >
          {zoomLevels.map((z) => (
            <option key={z} value={z}>{z}%</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={settings.showRuler}
            onChange={(e) => onSettingsChange({ ...settings, showRuler: e.target.checked })}
            className="rounded"
          />
          Ruler
        </label>
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={settings.showNavigation}
            onChange={(e) => onSettingsChange({ ...settings, showNavigation: e.target.checked })}
            className="rounded"
          />
          Navigation
        </label>
      </div>
    </div>
  );
}
