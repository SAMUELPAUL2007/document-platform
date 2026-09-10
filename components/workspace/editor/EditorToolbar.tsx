"use client";

import React, { useState } from "react";
import type { EditorTool } from "../../../lib/workspace/editor-types";
import type { UseEditorState } from "../../../lib/workspace/editor-state";

interface EditorToolbarProps {
  editorState: UseEditorState;
  onImageUpload: () => void;
  onSignature: () => void;
}

const TOOLS: { id: EditorTool; label: string; icon: string; group: string }[] = [
  { id: "select", label: "Select", icon: "⊹", group: "select" },
  { id: "text", label: "Text", icon: "T", group: "text" },
  { id: "drawing", label: "Draw", icon: "✎", group: "draw" },
  { id: "highlight", label: "Highlight", icon: "▬", group: "annotate" },
  { id: "underline", label: "Underline", icon: "U̲", group: "annotate" },
  { id: "strikethrough", label: "Strike", icon: "S̶", group: "annotate" },
  { id: "rectangle", label: "Rectangle", icon: "□", group: "shapes" },
  { id: "ellipse", label: "Ellipse", icon: "○", group: "shapes" },
  { id: "line", label: "Line", icon: "╱", group: "shapes" },
  { id: "arrow", label: "Arrow", icon: "→", group: "shapes" },
  { id: "image", label: "Image", icon: "🖼", group: "insert" },
  { id: "signature", label: "Sign", icon: "✍", group: "insert" },
  { id: "watermark-text", label: "Watermark", icon: " האח", group: "insert" },
  { id: "page-number", label: "Page #", icon: "#", group: "insert" },
];

const COLORS = [
  "#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff",
  "#ffff00", "#ff00ff", "#00ffff", "#ff8800", "#8800ff",
];

export function EditorToolbar({ editorState, onImageUpload, onSignature }: EditorToolbarProps) {
  const {
    editor,
    activeTool,
    setActiveTool,
    textFormat,
    setTextFormat,
    drawingFormat,
    setDrawingFormat,
    shapeFormat,
    setShapeFormat,
    deleteObjects,
    duplicateObjects,
    copyObjects,
    pasteObjects,
    canUndo,
    canRedo,
    undo,
    redo,
  } = editorState;

  const [showFormat, setShowFormat] = useState(false);

  const handleToolClick = (tool: EditorTool) => {
    if (tool === "image") {
      onImageUpload();
      return;
    }
    if (tool === "signature") {
      onSignature();
      return;
    }
    setActiveTool(tool);
  };

  const handleDelete = () => {
    if (editor.selectedIds.length > 0) {
      deleteObjects(editor.selectedIds);
    }
  };

  const toolGroups = TOOLS.reduce<Record<string, typeof TOOLS>>((acc, t) => {
    if (!acc[t.group]) acc[t.group] = [];
    acc[t.group].push(t);
    return acc;
  }, {});

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-white border-b border-border">
      <button
        onClick={undo}
        disabled={!canUndo}
        className="p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
        title="Undo"
      >
        ↶
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        className="p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
        title="Redo"
      >
        ↷
      </button>

      <div className="w-px h-5 bg-border mx-1" />

      {Object.entries(toolGroups).map(([group, tools], gi) => (
        <React.Fragment key={group}>
          {gi > 0 && <div className="w-px h-5 bg-border mx-1" />}
          <div className="flex items-center gap-0.5">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool.id)}
                className={`px-2 py-1 text-sm rounded transition-colors ${
                  activeTool === tool.id
                    ? "bg-primary text-white"
                    : "hover:bg-muted text-foreground"
                }`}
                title={tool.label}
              >
                {tool.icon}
              </button>
            ))}
          </div>
        </React.Fragment>
      ))}

      <div className="w-px h-5 bg-border mx-1" />

      {editor.selectedIds.length > 0 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => copyObjects(editor.selectedIds)}
            className="px-2 py-1 text-xs rounded hover:bg-muted"
            title="Copy"
          >
            Copy
          </button>
          <button
            onClick={pasteObjects}
            className="px-2 py-1 text-xs rounded hover:bg-muted"
            title="Paste"
          >
            Paste
          </button>
          <button
            onClick={() => duplicateObjects(editor.selectedIds)}
            className="px-2 py-1 text-xs rounded hover:bg-muted"
            title="Duplicate"
          >
            Dup
          </button>
          <button
            onClick={handleDelete}
            className="px-2 py-1 text-xs rounded hover:bg-red-100 text-red-600"
            title="Delete"
          >
            Del
          </button>
          <button
            onClick={() => setShowFormat(!showFormat)}
            className="px-2 py-1 text-xs rounded hover:bg-muted"
            title="Format"
          >
            Format
          </button>
        </div>
      )}

      {showFormat && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-border p-3 z-50 min-w-[300px]">
          <FormatPanel editorState={editorState} />
        </div>
      )}

      {(activeTool === "text" || activeTool === "drawing" || activeTool === "rectangle" || activeTool === "ellipse") && (
        <div className="flex items-center gap-2 ml-2">
          <div className="w-px h-5 bg-border" />
          {activeTool === "text" && (
            <div className="flex items-center gap-1">
              <select
                value={textFormat.fontFamily}
                onChange={(e) => setTextFormat({ ...textFormat, fontFamily: e.target.value })}
                className="text-xs border border-border rounded px-1 py-0.5"
              >
                <option value="Helvetica">Helvetica</option>
                <option value="Times-Roman">Times</option>
                <option value="Courier">Courier</option>
              </select>
              <input
                type="number"
                value={textFormat.fontSize}
                onChange={(e) => setTextFormat({ ...textFormat, fontSize: Number(e.target.value) })}
                className="w-12 text-xs border border-border rounded px-1 py-0.5"
                min={6}
                max={200}
              />
              <input
                type="color"
                value={textFormat.color}
                onChange={(e) => setTextFormat({ ...textFormat, color: e.target.value })}
                className="w-5 h-5 cursor-pointer border-none"
              />
            </div>
          )}
          {(activeTool === "drawing" || activeTool === "rectangle" || activeTool === "ellipse") && (
            <div className="flex items-center gap-1">
              <input
                type="color"
                value={activeTool === "drawing" ? drawingFormat.strokeColor : shapeFormat.strokeColor}
                onChange={(e) => {
                  if (activeTool === "drawing") {
                    setDrawingFormat({ ...drawingFormat, strokeColor: e.target.value });
                  } else {
                    setShapeFormat({ ...shapeFormat, strokeColor: e.target.value });
                  }
                }}
                className="w-5 h-5 cursor-pointer border-none"
              />
              <input
                type="range"
                min={1}
                max={10}
                value={activeTool === "drawing" ? drawingFormat.strokeWidth : shapeFormat.strokeWidth}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (activeTool === "drawing") {
                    setDrawingFormat({ ...drawingFormat, strokeWidth: val });
                  } else {
                    setShapeFormat({ ...shapeFormat, strokeWidth: val });
                  }
                }}
                className="w-16"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FormatPanel({ editorState }: { editorState: UseEditorState }) {
  const { editor, updateObject } = editorState;
  const selectedObj = editor.objects.find((o) => editor.selectedIds.includes(o.id));

  if (!selectedObj) return <p className="text-xs text-muted-foreground">No object selected</p>;

  const update = (changes: Record<string, unknown>) => {
    updateObject(selectedObj.id, changes as any);
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground mb-2">
        {selectedObj.type.toUpperCase()} Properties
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">X</span>
          <input
            type="number"
            value={Math.round(selectedObj.x)}
            onChange={(e) => update({ x: Number(e.target.value) })}
            className="border border-border rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Y</span>
          <input
            type="number"
            value={Math.round(selectedObj.y)}
            onChange={(e) => update({ y: Number(e.target.value) })}
            className="border border-border rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Width</span>
          <input
            type="number"
            value={Math.round(selectedObj.width)}
            onChange={(e) => update({ width: Number(e.target.value) })}
            className="border border-border rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Height</span>
          <input
            type="number"
            value={Math.round(selectedObj.height)}
            onChange={(e) => update({ height: Number(e.target.value) })}
            className="border border-border rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Opacity</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={selectedObj.opacity}
            onChange={(e) => update({ opacity: Number(e.target.value) })}
            className="w-full"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Rotation</span>
          <input
            type="number"
            value={selectedObj.rotation}
            onChange={(e) => update({ rotation: Number(e.target.value) })}
            className="border border-border rounded px-2 py-1"
          />
        </label>
      </div>
    </div>
  );
}
