"use client";

import { useState, useCallback, useRef } from "react";
import type { DocumentState, Selection, Clipboard, WorkspaceHistory, PageInfo } from "../lib/workspace/types";
import {
  loadPdfFromBytes,
  deletePages,
  rotatePages,
  reorderPage,
  reorderPagesMulti,
  duplicatePages,
  extractPages,
  insertPages,
  replacePages,
  mergePdf,
  cropPage,
  getPagesInfo,
} from "../lib/workspace/pdf-ops";

const MAX_HISTORY = 50;

interface WorkspaceStore {
  document: DocumentState | null;
  selection: Selection;
  clipboard: Clipboard | null;
  history: WorkspaceHistory;
  loading: boolean;
  error: string | null;
}

export function useWorkspace() {
  const [store, setStore] = useState<WorkspaceStore>({
    document: null,
    selection: new Set<number>(),
    clipboard: null,
    history: { past: [], future: [] },
    loading: false,
    error: null,
  });

  const renderCache = useRef<Map<number, string>>(new Map());

  const pushHistory = useCallback((state: WorkspaceStore): WorkspaceStore => {
    if (!state.document) return state;
    const entry = {
      pdfBytes: new Uint8Array(state.document.pdfBytes),
      pages: [...state.document.pages],
      documentName: state.document.documentName,
    };
    const past = [...state.history.past, entry].slice(-MAX_HISTORY);
    return { ...state, history: { past, future: [] } };
  }, []);

  const undo = useCallback(() => {
    setStore((prev) => {
      if (prev.history.past.length === 0) return prev;
      const past = [...prev.history.past];
      const entry = past.pop()!;
      const currentEntry = prev.document
        ? { pdfBytes: new Uint8Array(prev.document.pdfBytes), pages: [...prev.document.pages], documentName: prev.document.documentName }
        : null;
      const future = currentEntry ? [currentEntry, ...prev.history.future] : prev.history.future;
      return {
        ...prev,
        document: { pdfBytes: entry.pdfBytes, pages: entry.pages, documentName: entry.documentName },
        selection: new Set<number>(),
        history: { past, future },
      };
    });
    renderCache.current.clear();
  }, []);

  const redo = useCallback(() => {
    setStore((prev) => {
      if (prev.history.future.length === 0) return prev;
      const future = [...prev.history.future];
      const entry = future.shift()!;
      const currentEntry = prev.document
        ? { pdfBytes: new Uint8Array(prev.document.pdfBytes), pages: [...prev.document.pages], documentName: prev.document.documentName }
        : null;
      const past = currentEntry ? [...prev.history.past, currentEntry] : prev.history.past;
      return {
        ...prev,
        document: { pdfBytes: entry.pdfBytes, pages: entry.pages, documentName: entry.documentName },
        selection: new Set<number>(),
        history: { past, future },
      };
    });
    renderCache.current.clear();
  }, []);

  const loadPdf = useCallback(
    async (bytes: Uint8Array, name?: string) => {
      setStore((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const doc = await loadPdfFromBytes(bytes);
        if (name) doc.documentName = name;
        setStore((prev) => ({
          ...prev,
          document: doc,
          selection: new Set<number>(),
          clipboard: null,
          history: { past: [], future: [] },
          loading: false,
        }));
        renderCache.current.clear();
      } catch (err) {
        setStore((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load PDF",
        }));
      }
    },
    []
  );

  const executeOperation = useCallback(
    async (op: (doc: DocumentState) => Promise<Uint8Array>) => {
      setStore((prev) => {
        if (!prev.document) return prev;
        const newStore = pushHistory(prev);
        return { ...newStore, loading: true };
      });

      try {
        const result = await (async () => {
          const current = store.document;
          if (!current) throw new Error("No document loaded");
          return op(current);
        })();

        const pages = await getPagesInfo(result);
        setStore((prev) => ({
          ...prev,
          document: { ...prev.document!, pdfBytes: result, pages },
          selection: new Set<number>(),
          loading: false,
        }));
        renderCache.current.clear();
      } catch (err) {
        setStore((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Operation failed",
        }));
      }
    },
    [store.document, pushHistory]
  );

  const toggleSelection = useCallback((index: number) => {
    setStore((prev) => {
      const newSel = new Set(prev.selection);
      if (newSel.has(index)) newSel.delete(index);
      else newSel.add(index);
      return { ...prev, selection: newSel };
    });
  }, []);

  const selectAll = useCallback(() => {
    setStore((prev) => {
      if (!prev.document) return prev;
      const all = new Set(prev.document.pages.map((_p: PageInfo, i: number) => i));
      return { ...prev, selection: all };
    });
  }, []);

  const deselectAll = useCallback(() => {
    setStore((prev) => ({ ...prev, selection: new Set<number>() }));
  }, []);

  const deleteSelected = useCallback(() => {
    executeOperation((doc) => deletePages(doc, [...store.selection]));
  }, [store.selection, executeOperation]);

  const rotateSelected = useCallback(
    (degrees: 90 | 180 | 270) => {
      executeOperation((doc) => rotatePages(doc, [...store.selection], degrees));
    },
    [store.selection, executeOperation]
  );

  const duplicateSelected = useCallback(() => {
    executeOperation((doc) => duplicatePages(doc, [...store.selection]));
  }, [store.selection, executeOperation]);

  const copySelected = useCallback(() => {
    if (!store.document || store.selection.size === 0) return;
    setStore((prev) => ({
      ...prev,
      clipboard: {
        pdfBytes: new Uint8Array(prev.document!.pdfBytes),
        pageIndices: [...prev.selection],
      },
    }));
  }, [store.document, store.selection]);

  const pasteClipboard = useCallback(
    (afterIndex: number) => {
      if (!store.clipboard) return;
      executeOperation(async (doc) => {
        const tempState: DocumentState = {
          pdfBytes: store.clipboard!.pdfBytes,
          pages: [],
          documentName: "",
        };
        const extracted = await extractPages(tempState, store.clipboard!.pageIndices);
        return insertPages(doc, afterIndex, extracted);
      });
    },
    [store.clipboard, executeOperation]
  );

  const reorderSingle = useCallback(
    (fromIndex: number, toIndex: number) => {
      executeOperation((doc) => reorderPage(doc, fromIndex, toIndex));
    },
    [executeOperation]
  );

  const reorderMulti = useCallback(
    (toIndex: number) => {
      executeOperation((doc) => reorderPagesMulti(doc, [...store.selection], toIndex));
    },
    [store.selection, executeOperation]
  );

  const extractSelected = useCallback(async () => {
    if (!store.document || store.selection.size === 0) return null;
    return extractPages(store.document, [...store.selection]);
  }, [store.document, store.selection]);

  const insertNewPages = useCallback(
    (afterIndex: number, insertBytes: Uint8Array) => {
      executeOperation((doc) => insertPages(doc, afterIndex, insertBytes));
    },
    [executeOperation]
  );

  const replaceSelected = useCallback(
    (replacementBytes: Uint8Array) => {
      executeOperation((doc) => replacePages(doc, [...store.selection], replacementBytes));
    },
    [store.selection, executeOperation]
  );

  const mergeNewPdf = useCallback(
    (mergeBytes: Uint8Array, position?: number) => {
      executeOperation((doc) => mergePdf(doc, mergeBytes, position));
    },
    [executeOperation]
  );

  const cropSelected = useCallback(
    (x: number, y: number, width: number, height: number) => {
      if (store.selection.size !== 1) return;
      const pageIndex = [...store.selection][0];
      executeOperation((doc) => cropPage(doc, pageIndex, x, y, width, height));
    },
    [store.selection, executeOperation]
  );

  const renameDocument = useCallback((name: string) => {
    setStore((prev) => {
      if (!prev.document) return prev;
      return { ...prev, document: { ...prev.document, documentName: name } };
    });
  }, []);

  const exportPdf = useCallback(async () => {
    if (!store.document) return null;
    const src = store.document.pdfBytes;
    const buf = new ArrayBuffer(src.byteLength);
    new Uint8Array(buf).set(src);
    return new Blob([new Uint8Array(buf)], { type: "application/pdf" });
  }, [store.document]);

  const downloadPdf = useCallback(async () => {
    const blob = await exportPdf();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${store.document?.documentName || "document"}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportPdf, store.document?.documentName]);

  const sharePdf = useCallback(async () => {
    const blob = await exportPdf();
    if (!blob) return false;
    const file = new File([blob], `${store.document?.documentName || "document"}.pdf`, {
      type: "application/pdf",
    });
    if (navigator.share) {
      try {
        await navigator.share({ files: [file], title: store.document?.documentName });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, [exportPdf, store.document?.documentName]);

  return {
    document: store.document,
    selection: store.selection,
    clipboard: store.clipboard,
    loading: store.loading,
    error: store.error,
    canUndo: store.history.past.length > 0,
    canRedo: store.history.future.length > 0,
    loadPdf,
    undo,
    redo,
    toggleSelection,
    selectAll,
    deselectAll,
    deleteSelected,
    rotateSelected,
    duplicateSelected,
    copySelected,
    pasteClipboard,
    reorderSingle,
    reorderMulti,
    extractSelected,
    insertNewPages,
    replaceSelected,
    mergeNewPdf,
    cropSelected,
    renameDocument,
    exportPdf,
    downloadPdf,
    sharePdf,
    renderCache,
  };
}
