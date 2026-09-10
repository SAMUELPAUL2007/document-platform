"use client";

import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import type {
  EditorObject,
  EditorTool,
  TextObject,
  DrawingObject,
  HighlightObject,
  ShapeObject,
  ArrowObject,
  WatermarkObject,
  Point,
} from "../../../lib/workspace/editor-types";
import type { UseEditorState } from "../../../lib/workspace/editor-state";
import { TextEditor } from "./TextEditor";

interface EditorCanvasProps {
  editorState: UseEditorState;
  pageWidth: number;
  pageHeight: number;
  scale: number;
  pageIndex: number;
}

interface DragState {
  type: "move" | "resize" | "create" | "draw" | "arrow";
  objectId?: string;
  handle?: string;
  startX: number;
  startY: number;
  origX?: number;
  origY?: number;
  origW?: number;
  origH?: number;
  origStartX?: number;
  origStartY?: number;
  origEndX?: number;
  origEndY?: number;
  points?: Point[];
}

const TOOLS_CREATING: EditorTool[] = [
  "text", "highlight", "underline", "strikethrough",
  "rectangle", "ellipse", "line", "arrow", "signature",
  "watermark-text", "watermark-image", "page-number",
];

export function EditorCanvas({
  editorState,
  pageWidth,
  pageHeight,
  scale,
  pageIndex,
}: EditorCanvasProps) {
  const {
    editor,
    activeTool,
    addObject,
    updateObject,
    deleteObjects,
    selectObject,
    deselectAll,
    hitTest,
    moveObject,
    resizeObject,
    commitHistory,
    textFormat,
    drawingFormat,
    shapeFormat,
  } = editorState;

  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [tempPath, setTempPath] = useState<Point[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingTextFormat, setEditingTextFormat] = useState({
    fontFamily: "Helvetica",
    fontSize: 16,
    fontWeight: "normal" as "normal" | "bold",
    fontStyle: "normal" as "normal" | "italic",
    color: "#000000",
    textAlign: "left" as "left" | "center" | "right",
  });

  const pageObjects = useMemo(
    () =>
      editor.objects
        .filter((o) => o.pageIndex === pageIndex)
        .sort((a, b) => a.zIndex - b.zIndex),
    [editor.objects, pageIndex]
  );

  const svgWidth = pageWidth * scale;
  const svgHeight = pageHeight * scale;

  const toSvgCoords = useCallback(
    (clientX: number, clientY: number): Point => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      };
    },
    [scale]
  );

  const selectedObjects = useMemo(
    () => pageObjects.filter((o) => editor.selectedIds.includes(o.id)),
    [pageObjects, editor.selectedIds]
  );

  const getResizeHandles = useCallback((obj: EditorObject) => {
    const handles = [];
    const { x, y, width: w, height: h } = obj.type === "arrow"
      ? {
          x: Math.min((obj as ArrowObject).startX, (obj as ArrowObject).endX),
          y: Math.min((obj as ArrowObject).startY, (obj as ArrowObject).endY),
          width: Math.abs((obj as ArrowObject).endX - (obj as ArrowObject).startX) || 10,
          height: Math.abs((obj as ArrowObject).endY - (obj as ArrowObject).startY) || 10,
        }
      : obj;

    const hs = 6;
    const positions: Record<string, Point> = {
      nw: { x: x - hs / 2, y: y - hs / 2 },
      n: { x: x + w / 2 - hs / 2, y: y - hs / 2 },
      ne: { x: x + w - hs / 2, y: y - hs / 2 },
      e: { x: x + w - hs / 2, y: y + h / 2 - hs / 2 },
      se: { x: x + w - hs / 2, y: y + h - hs / 2 },
      s: { x: x + w / 2 - hs / 2, y: y + h - hs / 2 },
      sw: { x: x - hs / 2, y: y + h - hs / 2 },
      w: { x: x - hs / 2, y: y + h / 2 - hs / 2 },
    };

    for (const [pos, coords] of Object.entries(positions)) {
      handles.push(
        <rect
          key={pos}
          x={coords.x}
          y={coords.y}
          width={hs}
          height={hs}
          fill="white"
          stroke="#2563eb"
          strokeWidth={1.5}
          style={{ cursor: `${pos}-resize` }}
          data-handle={pos}
        />
      );
    }

    const cx = x + w / 2;
    const cy = y - 16;
    handles.push(
      <g key="rotate" data-handle="rotate" style={{ cursor: "grab" }}>
        <line x1={cx} y1={y} x2={cx} y2={cy + 4} stroke="#2563eb" strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={5} fill="white" stroke="#2563eb" strokeWidth={1.5} />
      </g>
    );

    return handles;
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const pt = toSvgCoords(e.clientX, e.clientY);

      if (activeTool === "select") {
        const hit = hitTest(pt.x, pt.y);

        if (hit) {
          const handleEl = (e.target as SVGElement).closest("[data-handle]");
          if (handleEl) {
            const handle = handleEl.getAttribute("data-handle")!;
            if (handle === "rotate") return;
            setDrag({
              type: "resize",
              objectId: hit.id,
              handle,
              startX: pt.x,
              startY: pt.y,
              origX: hit.x,
              origY: hit.y,
              origW: hit.width,
              origH: hit.height,
              origStartX: (hit as ArrowObject).startX,
              origStartY: (hit as ArrowObject).startY,
              origEndX: (hit as ArrowObject).endX,
              origEndY: (hit as ArrowObject).endY,
            });
          } else {
            if (!editor.selectedIds.includes(hit.id)) {
              selectObject(hit.id, e.shiftKey);
            }
            setDrag({
              type: "move",
              objectId: hit.id,
              startX: pt.x,
              startY: pt.y,
              origX: hit.x,
              origY: hit.y,
              origStartX: (hit as ArrowObject).startX,
              origStartY: (hit as ArrowObject).startY,
              origEndX: (hit as ArrowObject).endX,
              origEndY: (hit as ArrowObject).endY,
            });
          }
        } else {
          deselectAll();
        }
        return;
      }

      if (activeTool === "drawing") {
        setDrag({ type: "draw", startX: pt.x, startY: pt.y, points: [pt] });
        setTempPath([pt]);
        return;
      }

      if (activeTool === "arrow") {
        setDrag({ type: "arrow", startX: pt.x, startY: pt.y });
        setTempPath([pt]);
        return;
      }

      if (activeTool === "text") {
        addObject({
          type: "text",
          pageIndex,
          x: pt.x,
          y: pt.y,
          width: 200,
          height: 30,
          rotation: 0,
          locked: false,
          opacity: 1,
          text: "Text",
          fontFamily: textFormat.fontFamily,
          fontSize: textFormat.fontSize,
          fontWeight: textFormat.fontWeight,
          fontStyle: textFormat.fontStyle,
          color: textFormat.color,
          textAlign: textFormat.textAlign,
          lineHeight: 1.2,
        });
        return;
      }

      if (
        activeTool === "highlight" ||
        activeTool === "underline" ||
        activeTool === "strikethrough"
      ) {
        setDrag({ type: "create", startX: pt.x, startY: pt.y });
        setTempPath([pt]);
        return;
      }

      if (activeTool === "rectangle" || activeTool === "ellipse" || activeTool === "line") {
        setDrag({ type: "create", startX: pt.x, startY: pt.y });
        setTempPath([pt]);
        return;
      }

      if (activeTool === "signature") {
        addObject({
          type: "signature",
          pageIndex,
          x: pt.x,
          y: pt.y,
          width: 150,
          height: 50,
          rotation: 0,
          locked: false,
          opacity: 1,
          signatureBytes: new Uint8Array(0),
        });
        return;
      }

      if (activeTool === "watermark-text") {
        addObject({
          type: "watermark",
          pageIndex,
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
          rotation: 0,
          locked: false,
          opacity: 0.15,
          variant: "text",
          text: "WATERMARK",
          fontFamily: "Helvetica",
          fontSize: 48,
          color: "#cccccc",
        });
        return;
      }

      if (activeTool === "page-number") {
        addObject({
          type: "page-number",
          pageIndex,
          x: pageWidth / 2 - 20,
          y: pageHeight - 40,
          width: 40,
          height: 20,
          rotation: 0,
          locked: false,
          opacity: 1,
          text: "{page}",
          fontFamily: "Helvetica",
          fontSize: 12,
          color: "#000000",
          format: "page",
        });
        return;
      }
    },
    [
      activeTool,
      toSvgCoords,
      hitTest,
      selectObject,
      deselectAll,
      addObject,
      pageIndex,
      textFormat,
      pageWidth,
      pageHeight,
      editor.selectedIds,
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drag) return;
      const pt = toSvgCoords(e.clientX, e.clientY);
      const dx = pt.x - drag.startX;
      const dy = pt.y - drag.startY;

      if (drag.type === "move" && drag.objectId) {
        moveObject(drag.objectId, dx, dy);
        setDrag({ ...drag, startX: pt.x, startY: pt.y });
        return;
      }

      if (drag.type === "resize" && drag.objectId && drag.origX !== undefined) {
        const obj = editor.objects.find((o) => o.id === drag.objectId);
        if (!obj) return;

        let newX = drag.origX!;
        let newY = drag.origY!;
        let newW = drag.origW!;
        let newH = drag.origH!;

        if (obj.type === "arrow") {
          const arrow = obj as ArrowObject;
          let newStartX = drag.origStartX! + dx;
          let newStartY = drag.origStartY! + dy;
          let newEndX = drag.origEndX! + dx;
          let newEndY = drag.origEndY! + dy;

          if (drag.handle?.includes("e") || drag.handle === "ne" || drag.handle === "se") {
            newEndX = drag.origEndX! + dx;
          }
          if (drag.handle?.includes("w") || drag.handle === "nw" || drag.handle === "sw") {
            newStartX = drag.origStartX! + dx;
          }
          if (drag.handle?.includes("n") || drag.handle === "ne" || drag.handle === "nw") {
            newStartY = drag.origStartY! + dy;
          }
          if (drag.handle?.includes("s") || drag.handle === "se" || drag.handle === "sw") {
            newEndY = drag.origEndY! + dy;
          }

          updateObject(drag.objectId, {
            startX: newStartX,
            startY: newStartY,
            endX: newEndX,
            endY: newEndY,
          } as any);
          return;
        }

        if (drag.handle?.includes("e")) newW = drag.origW! + dx;
        if (drag.handle?.includes("w")) {
          newW = drag.origW! - dx;
          newX = drag.origX! + dx;
        }
        if (drag.handle?.includes("s")) newH = drag.origH! + dy;
        if (drag.handle?.includes("n")) {
          newH = drag.origH! - dy;
          newY = drag.origY! + dy;
        }
        if (newW < 10) { newW = 10; newX = drag.origX! + drag.origW! - 10; }
        if (newH < 10) { newH = 10; newY = drag.origY! + drag.origH! - 10; }

        resizeObject(drag.objectId, newX, newY, newW, newH);
        return;
      }

      if (drag.type === "draw" && drag.points) {
        const newPoints = [...drag.points, pt];
        setTempPath(newPoints);
        setDrag({ ...drag, points: newPoints });
        return;
      }

      if (drag.type === "arrow") {
        setTempPath([drag.startX ? { x: drag.startX, y: drag.startY } : pt, pt]);
        return;
      }

      if (drag.type === "create") {
        setTempPath([pt]);
        return;
      }
    },
    [drag, toSvgCoords, moveObject, resizeObject, updateObject, editor.objects]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!drag) return;
      const pt = toSvgCoords(e.clientX, e.clientY);

      if (drag.type === "move" || drag.type === "resize") {
        commitHistory();
        setDrag(null);
        return;
      }

      if (drag.type === "draw" && drag.points && drag.points.length > 1) {
        const minX = Math.min(...drag.points.map((p) => p.x));
        const minY = Math.min(...drag.points.map((p) => p.y));
        const maxX = Math.max(...drag.points.map((p) => p.x));
        const maxY = Math.max(...drag.points.map((p) => p.y));

        addObject({
          type: "drawing",
          pageIndex,
          x: minX,
          y: minY,
          width: maxX - minX || 10,
          height: maxY - minY || 10,
          rotation: 0,
          locked: false,
          opacity: 1,
          points: drag.points,
          strokeColor: drawingFormat.strokeColor,
          strokeWidth: drawingFormat.strokeWidth,
        });
        setTempPath([]);
        setDrag(null);
        return;
      }

      if (drag.type === "arrow" && drag.startX !== undefined) {
        const endX = pt.x;
        const endY = pt.y;
        const dist = Math.hypot(endX - drag.startX, endY - drag.startY);
        if (dist > 5) {
          addObject({
            type: "arrow",
            pageIndex,
            x: Math.min(drag.startX, endX),
            y: Math.min(drag.startY, endY),
            width: Math.abs(endX - drag.startX),
            height: Math.abs(endY - drag.startY),
            rotation: 0,
            locked: false,
            opacity: 1,
            startX: drag.startX,
            startY: drag.startY,
            endX,
            endY,
            strokeColor: shapeFormat.strokeColor,
            strokeWidth: shapeFormat.strokeWidth,
          });
        }
        setTempPath([]);
        setDrag(null);
        return;
      }

      if (drag.type === "create") {
        const endX = pt.x;
        const endY = pt.y;
        const x = Math.min(drag.startX, endX);
        const y = Math.min(drag.startY, endY);
        const w = Math.abs(endX - drag.startX);
        const h = Math.abs(endY - drag.startY);

        if (w > 5 && h > 5) {
          if (
            activeTool === "highlight" ||
            activeTool === "underline" ||
            activeTool === "strikethrough"
          ) {
            addObject({
              type: activeTool === "highlight" ? "highlight" : activeTool === "underline" ? "underline" : "strikethrough",
              pageIndex,
              x,
              y,
              width: w,
              height: h,
              rotation: 0,
              locked: false,
              opacity: 0.4,
              color: "#ffff00",
            });
          } else {
            addObject({
              type: activeTool as "rectangle" | "ellipse" | "line",
              pageIndex,
              x,
              y,
              width: w,
              height: h,
              rotation: 0,
              locked: false,
              opacity: 1,
              strokeColor: shapeFormat.strokeColor,
              strokeWidth: shapeFormat.strokeWidth,
              fillColor: shapeFormat.fillColor,
            });
          }
        }
        setTempPath([]);
        setDrag(null);
        return;
      }

      setDrag(null);
    },
    [drag, toSvgCoords, addObject, pageIndex, activeTool, drawingFormat, shapeFormat, commitHistory]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool !== "select") return;
      const pt = toSvgCoords(e.clientX, e.clientY);
      const hit = hitTest(pt.x, pt.y);

      if (hit && hit.type === "text") {
        const textObj = hit as TextObject;
        setEditingTextId(textObj.id);
        setEditingText(textObj.text);
        setEditingTextFormat({
          fontFamily: textObj.fontFamily,
          fontSize: textObj.fontSize,
          fontWeight: textObj.fontWeight,
          fontStyle: textObj.fontStyle,
          color: textObj.color,
          textAlign: textObj.textAlign,
        });
      }
    },
    [activeTool, toSvgCoords, hitTest]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingTextId) return;

      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        editor.selectedIds.length > 0 &&
        activeTool === "select"
      ) {
        e.preventDefault();
        deleteObjects(editor.selectedIds);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingTextId, editor.selectedIds, activeTool, deleteObjects]);

  const handleTextSave = useCallback(
    (text: string, format: typeof editingTextFormat) => {
      if (editingTextId) {
        commitHistory();
        updateObject(editingTextId, {
          text,
          fontFamily: format.fontFamily,
          fontSize: format.fontSize,
          fontWeight: format.fontWeight,
          fontStyle: format.fontStyle,
          color: format.color,
          textAlign: format.textAlign,
        } as any);
      }
      setEditingTextId(null);
    },
    [editingTextId, updateObject, commitHistory]
  );

  const editingObject = editingTextId
    ? editor.objects.find((o) => o.id === editingTextId)
    : null;

  return (
    <div className="relative" style={{ width: svgWidth, height: svgHeight }}>
      <svg
        ref={svgRef}
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${pageWidth} ${pageHeight}`}
        className="absolute inset-0"
        style={{ cursor: getCursorForTool(activeTool) }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        {pageObjects.map((obj) => (
          <ObjectRenderer key={obj.id} object={obj} isSelected={editor.selectedIds.includes(obj.id)} />
        ))}

        {selectedObjects.map((obj) => (
          <g key={`handles-${obj.id}`}>
            <rect
              x={obj.x - 2}
              y={obj.y - 2}
              width={obj.width + 4}
              height={obj.height + 4}
              fill="none"
              stroke="#2563eb"
              strokeWidth={1}
              strokeDasharray="4 2"
              pointerEvents="none"
            />
            {getResizeHandles(obj)}
          </g>
        ))}

        {drag?.type === "draw" && tempPath.length > 1 && (
          <polyline
            points={tempPath.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={drawingFormat.strokeColor}
            strokeWidth={drawingFormat.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.7}
          />
        )}

        {drag?.type === "arrow" && tempPath.length === 2 && (
          <line
            x1={tempPath[0].x}
            y1={tempPath[0].y}
            x2={tempPath[1].x}
            y2={tempPath[1].y}
            stroke={shapeFormat.strokeColor}
            strokeWidth={shapeFormat.strokeWidth}
            opacity={0.7}
          />
        )}

        {drag?.type === "create" && tempPath.length === 2 && (
          <rect
            x={Math.min(tempPath[0].x, tempPath[1].x)}
            y={Math.min(tempPath[0].y, tempPath[1].y)}
            width={Math.abs(tempPath[1].x - tempPath[0].x)}
            height={Math.abs(tempPath[1].y - tempPath[0].y)}
            fill="none"
            stroke="#2563eb"
            strokeWidth={1}
            strokeDasharray="4 2"
            opacity={0.7}
          />
        )}
      </svg>

      {editingObject && editingObject.type === "text" && (
        <TextEditor
          object={editingObject as TextObject}
          scale={scale}
          text={editingText}
          format={editingTextFormat}
          onTextChange={setEditingText}
          onFormatChange={setEditingTextFormat}
          onSave={handleTextSave}
          onCancel={() => setEditingTextId(null)}
        />
      )}
    </div>
  );
}

function getCursorForTool(tool: EditorTool): string {
  switch (tool) {
    case "select": return "default";
    case "text": return "text";
    case "drawing": return "crosshair";
    case "highlight":
    case "underline":
    case "strikethrough": return "crosshair";
    case "rectangle":
    case "ellipse":
    case "line":
    case "arrow": return "crosshair";
    case "image": return "copy";
    case "signature": return "crosshair";
    default: return "default";
  }
}

function ObjectRenderer({ object: obj, isSelected }: { object: EditorObject; isSelected: boolean }) {
  switch (obj.type) {
    case "text": {
      const t = obj as TextObject;
      return (
        <text
          x={t.x}
          y={t.y + t.fontSize}
          fontFamily={t.fontFamily}
          fontSize={t.fontSize}
          fontWeight={t.fontWeight}
          fontStyle={t.fontStyle}
          fill={t.color}
          textAnchor={t.textAlign === "center" ? "middle" : t.textAlign === "right" ? "end" : "start"}
          opacity={t.opacity}
        >
          {t.text}
        </text>
      );
    }
    case "drawing": {
      const d = obj as DrawingObject;
      if (d.points.length < 2) return null;
      return (
        <polyline
          points={d.points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke={d.strokeColor}
          strokeWidth={d.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={d.opacity}
        />
      );
    }
    case "highlight":
    case "underline":
    case "strikethrough": {
      const h = obj as HighlightObject;
      if (h.type === "underline") {
        return (
          <line
            x1={h.x}
            y1={h.y + h.height}
            x2={h.x + h.width}
            y2={h.y + h.height}
            stroke={h.color}
            strokeWidth={2}
            opacity={h.opacity}
          />
        );
      }
      if (h.type === "strikethrough") {
        return (
          <line
            x1={h.x}
            y1={h.y + h.height / 2}
            x2={h.x + h.width}
            y2={h.y + h.height / 2}
            stroke={h.color}
            strokeWidth={2}
            opacity={h.opacity}
          />
        );
      }
      return (
        <rect
          x={h.x}
          y={h.y}
          width={h.width}
          height={h.height}
          fill={h.color}
          opacity={h.opacity}
        />
      );
    }
    case "rectangle": {
      const s = obj as ShapeObject;
      return (
        <rect
          x={s.x}
          y={s.y}
          width={s.width}
          height={s.height}
          fill={s.fillColor === "transparent" ? "none" : s.fillColor}
          stroke={s.strokeColor}
          strokeWidth={s.strokeWidth}
          opacity={s.opacity}
        />
      );
    }
    case "ellipse": {
      const s = obj as ShapeObject;
      return (
        <ellipse
          cx={s.x + s.width / 2}
          cy={s.y + s.height / 2}
          rx={s.width / 2}
          ry={s.height / 2}
          fill={s.fillColor === "transparent" ? "none" : s.fillColor}
          stroke={s.strokeColor}
          strokeWidth={s.strokeWidth}
          opacity={s.opacity}
        />
      );
    }
    case "line": {
      const s = obj as ShapeObject;
      return (
        <line
          x1={s.x}
          y1={s.y}
          x2={s.x + s.width}
          y2={s.y + s.height}
          stroke={s.strokeColor}
          strokeWidth={s.strokeWidth}
          opacity={s.opacity}
        />
      );
    }
    case "arrow": {
      const a = obj as ArrowObject;
      const angle = Math.atan2(a.endY - a.startY, a.endX - a.startX);
      const headLen = 10;
      const a1x = a.endX - headLen * Math.cos(angle - Math.PI / 6);
      const a1y = a.endY - headLen * Math.sin(angle - Math.PI / 6);
      const a2x = a.endX - headLen * Math.cos(angle + Math.PI / 6);
      const a2y = a.endY - headLen * Math.sin(angle + Math.PI / 6);
      return (
        <g opacity={a.opacity}>
          <line
            x1={a.startX} y1={a.startY} x2={a.endX} y2={a.endY}
            stroke={a.strokeColor} strokeWidth={a.strokeWidth}
          />
          <polyline
            points={`${a.endX},${a.endY} ${a1x},${a1y} ${a2x},${a2y}`}
            fill="none" stroke={a.strokeColor} strokeWidth={a.strokeWidth}
            strokeLinejoin="round"
          />
        </g>
      );
    }
    case "image":
    case "signature": {
      const img = obj as { imageBytes: Uint8Array; mimeType: string };
      const bytes = (obj as any).signatureBytes || img.imageBytes;
      if (!bytes || bytes.length === 0) {
        return (
          <rect
            x={obj.x} y={obj.y} width={obj.width} height={obj.height}
            fill="#f0f0f0" stroke="#ccc" strokeWidth={1}
            opacity={obj.opacity}
          />
        );
      }
      const blob = new Blob([bytes], { type: img.mimeType || "image/png" });
      const url = URL.createObjectURL(blob);
      return (
        <image
          href={url}
          x={obj.x} y={obj.y}
          width={obj.width} height={obj.height}
          opacity={obj.opacity}
          preserveAspectRatio="none"
        />
      );
    }
    case "watermark": {
      const w = obj as WatermarkObject;
      if (w.variant === "text" && w.text) {
        return (
          <text
            x={w.x + w.width / 2}
            y={w.y + w.height / 2}
            fontFamily={w.fontFamily || "Helvetica"}
            fontSize={w.fontSize || 48}
            fill={w.color || "#cccccc"}
            textAnchor="middle"
            dominantBaseline="middle"
            opacity={w.opacity}
            transform={`rotate(${w.rotation || -45}, ${w.x + w.width / 2}, ${w.y + w.height / 2})`}
          >
            {w.text}
          </text>
        );
      }
      return null;
    }
    case "page-number": {
      const p = obj as any;
      return (
        <text
          x={p.x}
          y={p.y + p.fontSize}
          fontFamily={p.fontFamily || "Helvetica"}
          fontSize={p.fontSize || 12}
          fill={p.color || "#000000"}
          opacity={p.opacity}
        >
          {p.text}
        </text>
      );
    }
    default:
      return null;
  }
}
