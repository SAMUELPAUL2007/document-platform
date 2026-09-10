"use client";

import React, { useRef, useEffect, useState } from "react";
import type { TextObject } from "../../../lib/workspace/editor-types";

interface TextEditorProps {
  object: TextObject;
  scale: number;
  text: string;
  format: {
    fontFamily: string;
    fontSize: number;
    fontWeight: "normal" | "bold";
    fontStyle: "normal" | "italic";
    color: string;
    textAlign: "left" | "center" | "right";
  };
  onTextChange: (text: string) => void;
  onFormatChange: (format: TextEditorProps["format"]) => void;
  onSave: (text: string, format: TextEditorProps["format"]) => void;
  onCancel: () => void;
}

const FONTS = [
  { label: "Helvetica", value: "Helvetica" },
  { label: "Times Roman", value: "Times-Roman" },
  { label: "Courier", value: "Courier" },
];

const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];

export function TextEditor({
  object,
  scale,
  text,
  format,
  onTextChange,
  onFormatChange,
  onSave,
  onCancel,
}: TextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localText, setLocalText] = useState(text);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSave(localText, format);
    }
  };

  const handleBlur = () => {
    onSave(localText, format);
  };

  const px = object.x * scale;
  const py = object.y * scale;
  const pw = object.width * scale;
  const ph = Math.max(object.height * scale, 40);

  return (
    <div className="absolute z-50" style={{ left: px, top: py, width: pw }}>
      <div className="bg-white rounded-lg shadow-lg border border-border overflow-hidden">
        <div className="flex items-center gap-1 px-2 py-1 border-b border-border bg-muted/30">
          <select
            value={format.fontFamily}
            onChange={(e) => onFormatChange({ ...format, fontFamily: e.target.value })}
            className="text-xs bg-transparent border-none outline-none px-1 py-0.5"
          >
            {FONTS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <select
            value={format.fontSize}
            onChange={(e) => onFormatChange({ ...format, fontSize: Number(e.target.value) })}
            className="text-xs bg-transparent border-none outline-none w-12 px-1 py-0.5"
          >
            {SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onFormatChange({
                ...format,
                fontWeight: format.fontWeight === "bold" ? "normal" : "bold",
              });
            }}
            className={`w-6 h-6 text-xs rounded ${format.fontWeight === "bold" ? "bg-primary text-white" : "hover:bg-muted"}`}
          >
            B
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onFormatChange({
                ...format,
                fontStyle: format.fontStyle === "italic" ? "normal" : "italic",
              });
            }}
            className={`w-6 h-6 text-xs rounded ${format.fontStyle === "italic" ? "bg-primary text-white" : "hover:bg-muted"}`}
          >
            I
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onFormatChange({ ...format, textAlign: "left" });
            }}
            className={`w-6 h-6 text-xs rounded ${format.textAlign === "left" ? "bg-primary text-white" : "hover:bg-muted"}`}
          >
            L
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onFormatChange({ ...format, textAlign: "center" });
            }}
            className={`w-6 h-6 text-xs rounded ${format.textAlign === "center" ? "bg-primary text-white" : "hover:bg-muted"}`}
          >
            C
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onFormatChange({ ...format, textAlign: "right" });
            }}
            className={`w-6 h-6 text-xs rounded ${format.textAlign === "right" ? "bg-primary text-white" : "hover:bg-muted"}`}
          >
            R
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <input
            type="color"
            value={format.color}
            onChange={(e) => onFormatChange({ ...format, color: e.target.value })}
            className="w-5 h-5 cursor-pointer border-none"
          />
        </div>
        <textarea
          ref={textareaRef}
          value={localText}
          onChange={(e) => {
            setLocalText(e.target.value);
            onTextChange(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="w-full p-2 resize-none outline-none border-none bg-transparent"
          style={{
            fontFamily: format.fontFamily,
            fontSize: format.fontSize,
            fontWeight: format.fontWeight,
            fontStyle: format.fontStyle,
            color: format.color,
            textAlign: format.textAlign,
            lineHeight: 1.2,
            minHeight: "60px",
          }}
          rows={3}
        />
      </div>
    </div>
  );
}
