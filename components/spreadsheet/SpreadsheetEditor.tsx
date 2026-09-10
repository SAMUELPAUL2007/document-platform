"use client";

import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import type { SpreadsheetData } from "@/lib/spreadsheet/types";
import { importXlsxToData, exportDataToXlsx } from "@/lib/spreadsheet/xlsx-io";
import { exportSpreadsheetToPdf } from "@/lib/spreadsheet/pdf-export";
import { searchSpreadsheet, replaceInSpreadsheet } from "@/lib/spreadsheet/search";
import { sortRange } from "@/lib/spreadsheet/sort-filter";
import type { SearchResult, SearchOptions } from "@/lib/spreadsheet/types";
import "x-data-spreadsheet/dist/xspreadsheet.css";

type ToolbarAction =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "align-left"
  | "align-center"
  | "align-right"
  | "color"
  | "bgcolor"
  | "font-size"
  | "merge"
  | "unmerge"
  | "insert-row-above"
  | "insert-row-below"
  | "insert-col-left"
  | "insert-col-right"
  | "delete-row"
  | "delete-col"
  | "search"
  | "sort-asc"
  | "sort-desc"
  | "number-format"
  | "undo"
  | "redo";

interface Selection {
  sri: number;
  sci: number;
  eri: number;
  eci: number;
}

export default function SpreadsheetEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const spreadsheetRef = useRef<Record<string, unknown> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);
  const [currentData, setCurrentData] = useState<SpreadsheetData>({});
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [sheetCount, setSheetCount] = useState(1);
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceValue, setReplaceValue] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [searchInFormulas, setSearchInFormulas] = useState(false);
  const [fontSize, setFontSize] = useState(10);
  const [textColor, setTextColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [SpreadsheetClass, setSpreadsheetClass] = useState<unknown>(null);
  const [showMobileFallback, setShowMobileFallback] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    import("x-data-spreadsheet/dist/xspreadsheet.js").then((mod) => {
      setSpreadsheetClass(() => (mod as { default: new (...args: unknown[]) => unknown }).default);
    });
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setShowMobileFallback(window.innerWidth < 768);
    };
    checkMobile();
  }, []);

  const createSpreadsheet = useCallback(
    (data?: SpreadsheetData) => {
      if (!containerRef.current || !SpreadsheetClass) return;

      containerRef.current.innerHTML = "";

      const SpreadsheetCtor = SpreadsheetClass as new (
        el: HTMLElement,
        opts: Record<string, unknown>
      ) => Record<string, unknown>;

      const opts: Record<string, unknown> = {
        mode: "edit",
        showToolbar: true,
        showGrid: true,
        showContextmenu: true,
        showBottomBar: true,
        view: {
          height: () => containerRef.current?.clientHeight ?? 600,
          width: () => containerRef.current?.clientWidth ?? 800,
        },
        row: { len: 200, height: 25 },
        col: { len: 26, width: 100, indexWidth: 60, minWidth: 60 },
        style: {
          bgcolor: "",
          align: "left",
          valign: "middle",
          textwrap: false,
          strike: false,
          underline: false,
          color: "",
          font: { name: "Helvetica", size: 10, bold: false, italic: false },
        },
      };

      const ss = new SpreadsheetCtor(containerRef.current, opts);

      if (data && Object.keys(data).length > 0) {
        (ss.loadData as (d: SpreadsheetData) => void)(data);
      }

      (ss.change as (cb: (d: SpreadsheetData) => void) => void)(
        (d: SpreadsheetData) => {
          setCurrentData(d);
          setHasChanges(true);
          if (d) {
            const keys = Object.keys(d);
            setSheetCount(keys.length || 1);
          }
        }
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ss.on as any)(
        "cells-selected",
        (_cell: unknown, range: Selection) => {
          setSelection(range);
        }
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ss.on as any)(
        "cell-selected",
        (_cell: unknown, ri: number, ci: number) => {
          setSelection({ sri: ri, sci: ci, eri: ri, eci: ci });
        }
      );

      spreadsheetRef.current = ss;
      setLoaded(true);
    },
    [SpreadsheetClass]
  );

  useEffect(() => {
    if (SpreadsheetClass && !loaded) {
      createSpreadsheet();
    }
  }, [SpreadsheetClass, loaded, createSpreadsheet]);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const isMobile = window.innerWidth < 768;
      setShowMobileFallback(isMobile);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.name.match(/\.xlsx?$/i)) {
        alert("Please select an XLSX file.");
        return;
      }

      const buffer = await file.arrayBuffer();
      try {
        const { data } = importXlsxToData(buffer);
        setFileName(file.name);
        setHasChanges(false);
        setActiveSheetIndex(0);
        setSheetCount(Object.keys(data).length || 1);
        setCurrentData(data);
        createSpreadsheet(data);
      } catch (err) {
        console.error("Import error:", err);
        alert("Failed to import XLSX file. The file may be corrupted.");
      }
      e.target.value = "";
    },
    [createSpreadsheet]
  );

  const handleExportXlsx = useCallback(() => {
    const data = spreadsheetRef.current
      ? (spreadsheetRef.current.getData as () => SpreadsheetData)()
      : currentData;
    const buffer = exportDataToXlsx(data, { fileName });
    const blob = new Blob([buffer as unknown as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName?.replace(/\.xlsx?$/i, "") + ".xlsx" || "spreadsheet.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [currentData, fileName]);

  const handleExportPdf = useCallback(async () => {
    const data = spreadsheetRef.current
      ? (spreadsheetRef.current.getData as () => SpreadsheetData)()
      : currentData;
    try {
      const pdfBytes = await exportSpreadsheetToPdf(data, { pageSize: "a4" });
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName?.replace(/\.xlsx?$/i, "") + ".pdf" || "spreadsheet.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF export error:", err);
      alert("Failed to export PDF.");
    }
  }, [currentData, fileName]);

  const handleNew = useCallback(() => {
    if (hasChanges && !confirm("Discard current changes?")) return;
    setFileName("");
    setHasChanges(false);
    setActiveSheetIndex(0);
    setSheetCount(1);
    setCurrentData({});
    createSpreadsheet();
  }, [hasChanges, createSpreadsheet]);

  const handleToolbarAction = useCallback(
    (action: ToolbarAction) => {
      const ss = spreadsheetRef.current;
      if (!ss) return;

      const triggerChange = () => {
        const data = (ss.getData as () => SpreadsheetData)();
        setCurrentData(data);
        setHasChanges(true);
      };

      switch (action) {
        case "bold":
        case "italic":
        case "underline":
        case "strike": {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (ss as any)[action]?.();
          triggerChange();
          break;
        }
        case "align-left":
        case "align-center":
        case "align-right": {
          const alignMap: Record<string, string> = {
            "align-left": "left",
            "align-center": "center",
            "align-right": "right",
          };
          (ss as Record<string, (v: string) => void>)["align"]?.(
            alignMap[action]
          );
          triggerChange();
          break;
        }
        case "font-size": {
          (ss as Record<string, (v: number) => void>)["fontSize"]?.(fontSize);
          triggerChange();
          break;
        }
        case "color": {
          (ss as Record<string, (v: string) => void>)["fontColor"]?.(textColor);
          triggerChange();
          break;
        }
        case "bgcolor": {
          (ss as Record<string, (v: string) => void>)["bgColor"]?.(
            bgColor || "#ffffff"
          );
          triggerChange();
          break;
        }
        case "merge": {
          (ss as Record<string, () => void>)["merge"]?.();
          triggerChange();
          break;
        }
        case "unmerge": {
          (ss as Record<string, () => void>)["unmerge"]?.();
          triggerChange();
          break;
        }
        case "insert-row-above": {
          if (selection) {
            (ss as Record<string, (ri: number) => void>)["insertRow"]?.(
              selection.sri
            );
            triggerChange();
          }
          break;
        }
        case "insert-row-below": {
          if (selection) {
            (ss as Record<string, (ri: number) => void>)["insertRow"]?.(
              selection.eri + 1
            );
            triggerChange();
          }
          break;
        }
        case "insert-col-left": {
          if (selection) {
            (ss as Record<string, (ci: number) => void>)["insertColumn"]?.(
              selection.sci
            );
            triggerChange();
          }
          break;
        }
        case "insert-col-right": {
          if (selection) {
            (ss as Record<string, (ci: number) => void>)["insertColumn"]?.(
              selection.eci + 1
            );
            triggerChange();
          }
          break;
        }
        case "delete-row": {
          if (selection) {
            for (let r = selection.eri; r >= selection.sri; r--) {
              (ss as Record<string, (ri: number) => void>)["deleteRow"]?.(r);
            }
            triggerChange();
          }
          break;
        }
        case "delete-col": {
          if (selection) {
            for (let c = selection.eci; c >= selection.sci; c--) {
              (ss as Record<string, (ci: number) => void>)["deleteColumn"]?.(c);
            }
            triggerChange();
          }
          break;
        }
        case "sort-asc":
        case "sort-desc": {
          if (selection) {
            const data = (ss.getData as () => SpreadsheetData)();
            const sorted = sortRange(data, {
              sheetIndex: activeSheetIndex,
              startRow: selection.sri,
              endRow: selection.eri,
              startCol: selection.sci,
              endCol: selection.eci,
              ascending: action === "sort-asc",
            });
            (ss.loadData as (d: SpreadsheetData) => void)(sorted);
            setCurrentData(sorted);
            setHasChanges(true);
          }
          break;
        }
        case "undo": {
          (ss as Record<string, () => void>)["undo"]?.();
          triggerChange();
          break;
        }
        case "redo": {
          (ss as Record<string, () => void>)["redo"]?.();
          triggerChange();
          break;
        }
        case "search": {
          setShowSearch(true);
          break;
        }
      }
    },
    [selection, fontSize, textColor, bgColor, activeSheetIndex]
  );

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const results = searchSpreadsheet(currentData, {
      query: searchQuery,
      replaceWith: replaceValue,
      matchCase,
      matchEntireCell: false,
      searchInFormulas,
      searchDirection: "forward",
    });
    setSearchResults(results);
  }, [currentData, searchQuery, replaceValue, matchCase, searchInFormulas]);

  const handleReplace = useCallback(
    (all: boolean) => {
      if (!searchQuery.trim()) return;
      const options: SearchOptions = {
        query: searchQuery,
        replaceWith: replaceValue,
        matchCase,
        matchEntireCell: false,
        searchInFormulas,
        searchDirection: "forward",
      };

      if (all) {
        const { data, count } = replaceInSpreadsheet(currentData, options);
        setCurrentData(data);
        setHasChanges(true);
        if (spreadsheetRef.current) {
          (spreadsheetRef.current.loadData as (d: SpreadsheetData) => void)(data);
        }
        alert(`Replaced ${count} occurrences.`);
      } else if (searchResults.length > 0) {
        const first = searchResults[0];
        const singleReplace = replaceInSpreadsheet(currentData, {
          ...options,
          query: currentData[first.sheetIndex]?.rows?.[first.rowIndex]?.cells?.[first.colIndex]?.text ?? searchQuery,
        });
        setCurrentData(singleReplace.data);
        setHasChanges(true);
        if (spreadsheetRef.current) {
          (spreadsheetRef.current.loadData as (d: SpreadsheetData) => void)(singleReplace.data);
        }
      }
      handleSearch();
    },
    [currentData, searchQuery, replaceValue, matchCase, searchInFormulas, searchResults, handleSearch]
  );

  const jumpToResult = useCallback(
    (result: SearchResult) => {
      if (!spreadsheetRef.current) return;
      const ss = spreadsheetRef.current;
      setActiveSheetIndex(result.sheetIndex);
      (ss as Record<string, (si: number) => void>)["switchSheet"]?.(result.sheetIndex);
      (ss as Record<string, (ri: number, ci: number) => void>)["cell"]?.(
        result.rowIndex,
        result.colIndex
      );
    },
    []
  );

  const toolbarButtons = useMemo(
    () => [
      { action: "undo" as const, icon: "↩", label: "Undo", shortcut: "Ctrl+Z" },
      { action: "redo" as const, icon: "↪", label: "Redo", shortcut: "Ctrl+Y" },
      { divider: true },
      { action: "bold" as const, icon: "B", label: "Bold", shortcut: "Ctrl+B", className: "font-bold" },
      { action: "italic" as const, icon: "I", label: "Italic", shortcut: "Ctrl+I", className: "italic" },
      { action: "underline" as const, icon: "U", label: "Underline", shortcut: "Ctrl+U", className: "underline" },
      { action: "strike" as const, icon: "S", label: "Strikethrough", className: "line-through" },
      { divider: true },
      { action: "align-left" as const, icon: "☰", label: "Align Left" },
      { action: "align-center" as const, icon: "☰", label: "Align Center" },
      { action: "align-right" as const, icon: "☰", label: "Align Right" },
      { divider: true },
      { action: "merge" as const, icon: "⊞", label: "Merge Cells" },
      { action: "unmerge" as const, icon: "⊟", label: "Unmerge" },
      { divider: true },
      { action: "search" as const, icon: "🔍", label: "Find & Replace", shortcut: "Ctrl+H" },
      { divider: true },
      { action: "sort-asc" as const, icon: "↑", label: "Sort A→Z" },
      { action: "sort-desc" as const, icon: "↓", label: "Sort Z→A" },
    ],
    []
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50">
      <input
        ref={useRef<HTMLInputElement>(null)}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        id="xlsx-upload"
        onChange={handleFileUpload}
      />

      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b border-gray-200 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => document.getElementById("xlsx-upload")?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer"
            title="Open XLSX"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Open
          </button>

          <button
            onClick={handleNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer"
            title="New Spreadsheet"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New
          </button>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          <button
            onClick={handleExportXlsx}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors cursor-pointer"
            title="Download as XLSX"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            XLSX
          </button>

          <button
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors cursor-pointer"
            title="Download as PDF"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            PDF
          </button>
        </div>

        <div className="flex items-center gap-1">
          {fileName && (
            <span className="text-xs text-gray-500 mr-2 max-w-[200px] truncate">
              {fileName}
              {hasChanges && " *"}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center px-2 py-1 bg-white border-b border-gray-100 gap-0.5 overflow-x-auto">
        {toolbarButtons.map((btn, i) => {
          if ("divider" in btn && btn.divider) {
            return (
              <div key={`d-${i}`} className="w-px h-5 bg-gray-200 mx-1 shrink-0" />
            );
          }
          const b = btn as { action: ToolbarAction; icon: string; label: string; shortcut?: string; className?: string };
          return (
            <button
              key={b.action}
              onClick={() => handleToolbarAction(b.action)}
              className={`w-7 h-7 flex items-center justify-center rounded text-xs text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer shrink-0 ${b.className ?? ""}`}
              title={`${b.label}${b.shortcut ? ` (${b.shortcut})` : ""}`}
            >
              {b.icon}
            </button>
          );
        })}

        <div className="w-px h-5 bg-gray-200 mx-1 shrink-0" />

        <select
          value={fontSize}
          onChange={(e) => {
            setFontSize(Number(e.target.value));
            handleToolbarAction("font-size");
          }}
          className="h-7 px-1 text-xs border border-gray-200 rounded bg-white cursor-pointer"
          title="Font Size"
        >
          {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div className="relative">
          <label className="w-7 h-7 flex items-center justify-center rounded cursor-pointer hover:bg-gray-100" title="Text Color">
            <span className="text-xs font-bold" style={{ color: textColor }}>A</span>
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              onMouseUp={() => handleToolbarAction("color")}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
        </div>

        <div className="relative">
          <label className="w-7 h-7 flex items-center justify-center rounded cursor-pointer hover:bg-gray-100" title="Background Color">
            <span className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: bgColor || "#ffffff" }} />
            <input
              type="color"
              value={bgColor || "#ffffff"}
              onChange={(e) => setBgColor(e.target.value)}
              onMouseUp={() => handleToolbarAction("bgcolor")}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
        </div>
      </div>

      {showSearch && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-b border-blue-200 animate-fade-in">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Find..."
            className="flex-1 max-w-xs px-2 py-1 text-sm border border-gray-300 rounded bg-white"
            autoFocus
          />
          <input
            type="text"
            value={replaceValue}
            onChange={(e) => setReplaceValue(e.target.value)}
            placeholder="Replace with..."
            className="flex-1 max-w-xs px-2 py-1 text-sm border border-gray-300 rounded bg-white"
          />
          <label className="flex items-center gap-1 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={matchCase}
              onChange={(e) => setMatchCase(e.target.checked)}
              className="rounded"
            />
            Match case
          </label>
          <label className="flex items-center gap-1 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={searchInFormulas}
              onChange={(e) => setSearchInFormulas(e.target.checked)}
              className="rounded"
            />
            In formulas
          </label>
          <button
            onClick={handleSearch}
            className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 cursor-pointer"
          >
            Find
          </button>
          <button
            onClick={() => handleReplace(false)}
            className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300 cursor-pointer"
          >
            Replace
          </button>
          <button
            onClick={() => handleReplace(true)}
            className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300 cursor-pointer"
          >
            Replace All
          </button>
          <span className="text-xs text-gray-500">
            {searchResults.length} found
          </span>
          <button
            onClick={() => {
              setShowSearch(false);
              setSearchResults([]);
              setSearchQuery("");
              setReplaceValue("");
            }}
            className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {searchResults.length > 0 && showSearch && (
        <div className="px-3 py-1 bg-white border-b border-gray-100">
          <div className="flex gap-1 overflow-x-auto">
            {searchResults.slice(0, 50).map((r, i) => (
              <button
                key={`${r.sheetIndex}-${r.rowIndex}-${r.colIndex}-${i}`}
                onClick={() => jumpToResult(r)}
                className="px-2 py-0.5 text-xs bg-gray-100 rounded hover:bg-gray-200 cursor-pointer shrink-0"
              >
                {String.fromCharCode(65 + r.colIndex)}
                {r.rowIndex + 1}: {r.value.substring(0, 20)}
              </button>
            ))}
          </div>
        </div>
      )}

      {showMobileFallback ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 7.41A2.25 2.25 0 012.25 5.495V5.25" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Desktop Recommended
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              The spreadsheet editor works best on a desktop browser. On mobile, you can still upload and download files.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => document.getElementById("xlsx-upload")?.click()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                Upload XLSX File
              </button>
              <button
                onClick={() => setShowMobileFallback(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
              >
                Try Desktop View Anyway
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden"
          style={{ minHeight: 0 }}
        />
      )}

      <div className="flex items-center justify-between px-3 py-1 bg-white border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <span>Sheet {activeSheetIndex + 1} of {sheetCount}</span>
          {selection && (
            <span>
              {String.fromCharCode(65 + selection.sci)}
              {selection.sri + 1}
              {selection.sri !== selection.eri || selection.sci !== selection.eci
                ? `:${String.fromCharCode(65 + selection.eci)}${selection.eri + 1}`
                : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span>{fileName || "Untitled"}</span>
          {hasChanges && <span className="text-amber-500">Modified</span>}
        </div>
      </div>
    </div>
  );
}
