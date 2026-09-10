"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  EditorObject,
  EditorState,
  EditorHistory,
  EditorTool,
  Point,
  ObjectType,
} from "./editor-types";

let nextId = 1;
function generateId(): string {
  return `obj_${Date.now()}_${nextId++}`;
}

const MAX_HISTORY = 50;

function getBounds(obj: EditorObject): { x: number; y: number; width: number; height: number } {
  if (obj.type === "arrow") {
    const minX = Math.min(obj.startX, obj.endX);
    const minY = Math.min(obj.startY, obj.endY);
    const maxX = Math.max(obj.startX, obj.endX);
    const maxY = Math.max(obj.startY, obj.endY);
    return { x: minX, y: minY, width: maxX - minX || 10, height: maxY - minY || 10 };
  }
  return { x: obj.x, y: obj.y, width: obj.width, height: obj.height };
}

function pointInObject(px: number, py: number, obj: EditorObject): boolean {
  const b = getBounds(obj);
  const margin = 4;
  return (
    px >= b.x - margin &&
    px <= b.x + b.width + margin &&
    py >= b.y - margin &&
    py <= b.y + b.height + margin
  );
}

export function useEditorState() {
  const [editor, setEditor] = useState<EditorState>({
    objects: [],
    selectedIds: [],
    clipboard: [],
    activePageIndex: 0,
    zoom: 1,
  });

  const [history, setHistory] = useState<EditorHistory>({
    past: [],
    future: [],
  });

  const [activeTool, setActiveTool] = useState<EditorTool>("select");
  const [textFormat, setTextFormat] = useState({
    fontFamily: "Helvetica",
    fontSize: 16,
    fontWeight: "normal" as "normal" | "bold",
    fontStyle: "normal" as "normal" | "italic",
    color: "#000000",
    textAlign: "left" as "left" | "center" | "right",
  });
  const [drawingFormat, setDrawingFormat] = useState({
    strokeColor: "#000000",
    strokeWidth: 2,
  });
  const [shapeFormat, setShapeFormat] = useState({
    strokeColor: "#000000",
    strokeWidth: 2,
    fillColor: "transparent",
  });

  const historyRef = useRef(history);
  // Sync historyRef when history changes without violating the rules
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const pushHistory = useCallback((objects: EditorObject[]) => {
    setHistory((prev) => ({
      past: [...prev.past.slice(-(MAX_HISTORY - 1)), prev.future.length > 0 ? objects : prev.past[prev.past.length - 1] || []].filter(
        (e) => e !== undefined
      ),
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      const newPast = [...prev.past];
      const current = newPast.pop()!;
      return {
        past: newPast,
        future: [editor.objects, ...prev.future],
      };
    });
  }, [editor.objects]);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      const [next, ...rest] = prev.future;
      return {
        past: [...prev.past, editor.objects],
        future: rest,
      };
    });
  }, [editor.objects]);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const addObject = useCallback(
    (obj: Record<string, any>) => {
      pushHistory(editor.objects);
      const maxZ = editor.objects.reduce((max, o) => Math.max(max, o.zIndex), 0);
      const newObj = { ...obj, id: generateId(), zIndex: maxZ + 1 } as EditorObject;
      setEditor((prev) => ({
        ...prev,
        objects: [...prev.objects, newObj],
        selectedIds: [newObj.id],
      }));
      return newObj.id;
    },
    [editor.objects, pushHistory]
  );

  const updateObject = useCallback(
    (id: string, changes: Partial<EditorObject>) => {
      pushHistory(editor.objects);
      setEditor((prev) => ({
        ...prev,
        objects: prev.objects.map((o) =>
          o.id === id ? ({ ...o, ...changes } as EditorObject) : o
        ),
      }));
    },
    [editor.objects, pushHistory]
  );

  const deleteObjects = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      pushHistory(editor.objects);
      setEditor((prev) => ({
        ...prev,
        objects: prev.objects.filter((o) => !ids.includes(o.id)),
        selectedIds: prev.selectedIds.filter((id) => !ids.includes(id)),
      }));
    },
    [editor.objects, pushHistory]
  );

  const duplicateObjects = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      pushHistory(editor.objects);
      const toDuplicate = editor.objects.filter((o) => ids.includes(o.id));
      const maxZ = editor.objects.reduce((max, o) => Math.max(max, o.zIndex), 0);
      const copies = toDuplicate.map((o, i) => ({
        ...o,
        id: generateId(),
        x: o.x + 20,
        y: o.y + 20,
        zIndex: maxZ + i + 1,
      })) as EditorObject[];
      setEditor((prev) => ({
        ...prev,
        objects: [...prev.objects, ...copies],
        selectedIds: copies.map((c) => c.id),
      }));
    },
    [editor.objects, pushHistory]
  );

  const copyObjects = useCallback(
    (ids: string[]) => {
      const toCopy = editor.objects.filter((o) => ids.includes(o.id));
      setEditor((prev) => ({
        ...prev,
        clipboard: toCopy.map((o) => ({ ...o, id: generateId() } as EditorObject)),
      }));
    },
    [editor.objects]
  );

  const pasteObjects = useCallback(() => {
    if (editor.clipboard.length === 0) return;
    pushHistory(editor.objects);
    const maxZ = editor.objects.reduce((max, o) => Math.max(max, o.zIndex), 0);
    const pasted = editor.clipboard.map((o, i) => ({
      ...o,
      id: generateId(),
      pageIndex: editor.activePageIndex,
      x: o.x + 20,
      y: o.y + 20,
      zIndex: maxZ + i + 1,
    })) as EditorObject[];
    setEditor((prev) => ({
      ...prev,
      objects: [...prev.objects, ...pasted],
      selectedIds: pasted.map((p) => p.id),
    }));
  }, [editor.clipboard, editor.objects, editor.activePageIndex, pushHistory]);

  const selectObject = useCallback((id: string | null, multi?: boolean) => {
    setEditor((prev) => ({
      ...prev,
      selectedIds: multi
        ? id
          ? prev.selectedIds.includes(id)
            ? prev.selectedIds.filter((i) => i !== id)
            : [...prev.selectedIds, id]
          : prev.selectedIds
        : id
          ? [id]
          : [],
    }));
  }, []);

  const selectAll = useCallback(() => {
    setEditor((prev) => ({
      ...prev,
      selectedIds: prev.objects
        .filter((o) => o.pageIndex === prev.activePageIndex)
        .map((o) => o.id),
    }));
  }, []);

  const deselectAll = useCallback(() => {
    setEditor((prev) => ({ ...prev, selectedIds: [] }));
  }, []);

  const setActivePage = useCallback((index: number) => {
    setEditor((prev) => ({ ...prev, activePageIndex: index, selectedIds: [] }));
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setEditor((prev) => ({ ...prev, zoom: Math.max(0.25, Math.min(3, zoom)) }));
  }, []);

  const hitTest = useCallback(
    (x: number, y: number): EditorObject | null => {
      const pageObjects = editor.objects
        .filter((o) => o.pageIndex === editor.activePageIndex && !o.locked)
        .sort((a, b) => b.zIndex - a.zIndex);
      for (const obj of pageObjects) {
        if (pointInObject(x, y, obj)) return obj;
      }
      return null;
    },
    [editor.objects, editor.activePageIndex]
  );

  const moveObject = useCallback(
    (id: string, dx: number, dy: number) => {
      setEditor((prev) => ({
        ...prev,
        objects: prev.objects.map((o) => {
          if (o.id !== id) return o;
          if (o.type === "arrow") {
            return {
              ...o,
              startX: o.startX + dx,
              startY: o.startY + dy,
              endX: o.endX + dx,
              endY: o.endY + dy,
            } as EditorObject;
          }
          return { ...o, x: o.x + dx, y: o.y + dy } as EditorObject;
        }),
      }));
    },
    []
  );

  const resizeObject = useCallback(
    (id: string, newX: number, newY: number, newW: number, newH: number) => {
      setEditor((prev) => ({
        ...prev,
        objects: prev.objects.map((o) => {
          if (o.id !== id) return o;
          return { ...o, x: newX, y: newY, width: Math.max(10, newW), height: Math.max(10, newH) } as EditorObject;
        }),
      }));
    },
    []
  );

  const bringToFront = useCallback(
    (id: string) => {
      const maxZ = editor.objects.reduce((max, o) => Math.max(max, o.zIndex), 0);
      updateObject(id, { zIndex: maxZ + 1 });
    },
    [editor.objects, updateObject]
  );

  const sendToBack = useCallback(
    (id: string) => {
      const minZ = editor.objects.reduce((min, o) => Math.min(min, o.zIndex), Infinity);
      updateObject(id, { zIndex: minZ - 1 });
    },
    [editor.objects, updateObject]
  );

  const commitHistory = useCallback(() => {
    pushHistory(editor.objects);
  }, [editor.objects, pushHistory]);

  const restoreFromHistory = useCallback((objects: EditorObject[]) => {
    setEditor((prev) => ({ ...prev, objects, selectedIds: [] }));
  }, []);

  return {
    editor,
    activeTool,
    setActiveTool,
    textFormat,
    setTextFormat,
    drawingFormat,
    setDrawingFormat,
    shapeFormat,
    setShapeFormat,
    addObject,
    updateObject,
    deleteObjects,
    duplicateObjects,
    copyObjects,
    pasteObjects,
    selectObject,
    selectAll,
    deselectAll,
    setActivePage,
    setZoom,
    hitTest,
    moveObject,
    resizeObject,
    bringToFront,
    sendToBack,
    canUndo,
    canRedo,
    undo,
    redo,
    commitHistory,
    restoreFromHistory,
    history,
  };
}

export type UseEditorState = ReturnType<typeof useEditorState>;
