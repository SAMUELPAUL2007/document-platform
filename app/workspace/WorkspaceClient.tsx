"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useWorkspace } from "../../hooks/useWorkspace";
import { useEditorState } from "../../lib/workspace/editor-state";
import { bakeObjectsIntoPdf } from "../../lib/workspace/editor-ops";
import type { DocumentState } from "../../lib/workspace/types";
import WorkspaceDropZone from "../../components/workspace/WorkspaceDropZone";
import WorkspaceToolbar from "../../components/workspace/WorkspaceToolbar";
import ThumbnailGrid from "../../components/workspace/ThumbnailGrid";
import PdfViewer from "../../components/workspace/PdfViewer";
import ContextMenu from "../../components/workspace/ContextMenu";
import { EditorToolbar } from "../../components/workspace/editor/EditorToolbar";
import { EditorCanvas } from "../../components/workspace/editor/EditorCanvas";
import { ImageDialog } from "../../components/workspace/editor/ImageDialog";
import { SignatureDialog } from "../../components/workspace/editor/SignatureDialog";
import { WatermarkDialog } from "../../components/workspace/editor/WatermarkDialog";
import { PageNumberDialog } from "../../components/workspace/editor/PageNumberDialog";

type WorkspaceMode = "page" | "edit";

export default function WorkspaceClient() {
  const ws = useWorkspace();
  const editor = useEditorState();
  const [selectedViewerPage, setSelectedViewerPage] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; pageIndex: number } | null>(null);
  const [mode, setMode] = useState<WorkspaceMode>("page");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [showWatermarkDialog, setShowWatermarkDialog] = useState(false);
  const [showPageNumberDialog, setShowPageNumberDialog] = useState(false);

  useEffect(() => {
    editor.setActivePage(selectedViewerPage);
  }, [selectedViewerPage, editor.setActivePage]);

  const handleSave = useCallback(async () => {
    if (!ws.document) return;
    if (mode === "edit" && editor.editor.objects.length > 0) {
      try {
        const bakedBytes = await bakeObjectsIntoPdf(ws.document, editor.editor.objects);
        const bakedState: DocumentState = await import("../../lib/workspace/pdf-ops").then((m) =>
          m.loadPdfFromBytes(bakedBytes)
        );
        ws.loadPdf(bakedState.pdfBytes, ws.document.documentName);
        editor.deselectAll();
        setMode("page");
      } catch (err) {
        console.error("Failed to save edited PDF:", err);
      }
    } else {
      ws.downloadPdf();
    }
  }, [ws, mode, editor]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!ws.document) return;
      const isInput = (e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA";

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (mode === "edit") {
          editor.undo();
        } else {
          ws.undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        if (mode === "edit") {
          editor.redo();
        } else {
          ws.redo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "a" && !isInput) {
        e.preventDefault();
        if (mode === "edit") {
          editor.selectAll();
        } else {
          ws.selectAll();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && !isInput) {
        e.preventDefault();
        if (mode === "edit" && editor.editor.selectedIds.length > 0) {
          editor.copyObjects(editor.editor.selectedIds);
        } else if (ws.selection.size > 0) {
          ws.copySelected();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v" && !isInput) {
        e.preventDefault();
        if (mode === "edit" && editor.editor.clipboard.length > 0) {
          editor.pasteObjects();
        } else if (ws.clipboard) {
          ws.pasteClipboard(selectedViewerPage);
        }
      }
      if (e.key === "Delete" && !isInput) {
        e.preventDefault();
        if (mode === "edit" && editor.editor.selectedIds.length > 0) {
          editor.deleteObjects(editor.editor.selectedIds);
        } else if (ws.selection.size > 0) {
          ws.deleteSelected();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape") {
        if (mode === "edit") {
          editor.deselectAll();
        }
        ws.deselectAll();
        setContextMenu(null);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [ws, mode, editor, selectedViewerPage, handleSave]);

  const handleThumbnailSelect = useCallback(
    (index: number) => {
      if (ws.selection.size > 0) {
        ws.toggleSelection(index);
      } else {
        setSelectedViewerPage(index);
      }
    },
    [ws]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, pageIndex: number) => {
      if (!ws.selection.has(pageIndex)) {
        ws.toggleSelection(pageIndex);
      }
      setContextMenu({ x: e.clientX, y: e.clientY, pageIndex });
    },
    [ws]
  );

  const handleExtract = useCallback(async () => {
    const bytes = await ws.extractSelected();
    if (!bytes) return;
    const buf = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buf).set(bytes);
    const blob = new Blob([new Uint8Array(buf)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ws.document?.documentName || "extracted"}_pages.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [ws]);

  const handleInsert = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const bytes = new Uint8Array(await file.arrayBuffer());
      ws.insertNewPages(selectedViewerPage, bytes);
    };
    input.click();
  }, [ws, selectedViewerPage]);

  const handleReplace = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const bytes = new Uint8Array(await file.arrayBuffer());
      ws.replaceSelected(bytes);
    };
    input.click();
  }, [ws]);

  const handleCrop = useCallback(() => {
    if (ws.selection.size !== 1) return;
    const pageIndex = [...ws.selection][0];
    const page = ws.document?.pages[pageIndex];
    if (!page) return;
    const x = prompt("Crop X (points from left):", "0");
    const y = prompt("Crop Y (points from bottom):", "0");
    const w = prompt("Crop width:", String(page.width));
    const h = prompt("Crop height:", String(page.height));
    if (x && y && w && h) {
      ws.cropSelected(Number(x), Number(y), Number(w), Number(h));
    }
  }, [ws]);

  const handleImageInsert = useCallback(
    (bytes: Uint8Array, mimeType: string) => {
      if (!ws.document) return;
      const page = ws.document.pages[selectedViewerPage];
      if (!page) return;
      editor.addObject({
        type: "image",
        pageIndex: selectedViewerPage,
        x: 50,
        y: 50,
        width: 200,
        height: 200,
        rotation: 0,
        locked: false,
        opacity: 1,
        imageBytes: bytes,
        mimeType,
      });
    },
    [ws.document, selectedViewerPage, editor]
  );

  const handleSignatureInsert = useCallback(
    (bytes: Uint8Array) => {
      if (!ws.document) return;
      editor.addObject({
        type: "signature",
        pageIndex: selectedViewerPage,
        x: 50,
        y: 50,
        width: 150,
        height: 50,
        rotation: 0,
        locked: false,
        opacity: 1,
        signatureBytes: bytes,
      });
    },
    [ws.document, selectedViewerPage, editor]
  );

  const handleWatermarkInsert = useCallback(
    (config: { text: string; fontFamily: string; fontSize: number; color: string; opacity: number; rotation: number }) => {
      if (!ws.document) return;
      const page = ws.document.pages[selectedViewerPage];
      if (!page) return;
      editor.addObject({
        type: "watermark",
        pageIndex: selectedViewerPage,
        x: 0,
        y: 0,
        width: page.width,
        height: page.height,
        rotation: 0,
        locked: false,
        opacity: config.opacity,
        variant: "text",
        text: config.text,
        fontFamily: config.fontFamily,
        fontSize: config.fontSize,
        color: config.color,
      });
    },
    [ws.document, selectedViewerPage, editor]
  );

  const handlePageNumberInsert = useCallback(
    (config: { text: string; fontFamily: string; fontSize: number; color: string; format: string }) => {
      if (!ws.document) return;
      const page = ws.document.pages[selectedViewerPage];
      if (!page) return;
      editor.addObject({
        type: "page-number",
        pageIndex: selectedViewerPage,
        x: page.width / 2 - 20,
        y: page.height - 40,
        width: 40,
        height: 20,
        rotation: 0,
        locked: false,
        opacity: 1,
        text: config.text,
        fontFamily: config.fontFamily,
        fontSize: config.fontSize,
        color: config.color,
        format: config.format as "page" | "page-total" | "page-of-total",
      });
    },
    [ws.document, selectedViewerPage, editor]
  );

  const currentPage = ws.document?.pages[selectedViewerPage];

  if (!ws.document) {
    return (
      <div>
        <WorkspaceDropZone onPdfLoaded={ws.loadPdf} />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const bytes = new Uint8Array(await file.arrayBuffer());
            ws.loadPdf(bytes, file.name.replace(/\.pdf$/i, ""));
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode("page")}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              mode === "page"
                ? "bg-primary text-white"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Page View
          </button>
          <button
            onClick={() => setMode("edit")}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              mode === "edit"
                ? "bg-primary text-white"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Edit
          </button>
        </div>
        {mode === "edit" && (
          <div className="flex items-center gap-2">
            {editor.editor.objects.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {editor.editor.objects.filter((o) => o.pageIndex === selectedViewerPage).length} objects on this page
              </span>
            )}
            <button
              onClick={handleSave}
              className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Save Edits
            </button>
          </div>
        )}
      </div>

      {mode === "edit" && (
        <EditorToolbar
          editorState={editor}
          onImageUpload={() => setShowImageDialog(true)}
          onSignature={() => setShowSignatureDialog(true)}
        />
      )}

      {mode === "page" && (
        <WorkspaceToolbar
          documentName={ws.document.documentName}
          pageCount={ws.document.pages.length}
          selectionCount={ws.selection.size}
          hasClipboard={ws.clipboard !== null}
          canUndo={ws.canUndo}
          canRedo={ws.canRedo}
          onUndo={ws.undo}
          onRedo={ws.redo}
          onSelectAll={ws.selectAll}
          onDeselectAll={ws.deselectAll}
          onDelete={ws.deleteSelected}
          onRotate={ws.rotateSelected}
          onDuplicate={ws.duplicateSelected}
          onCopy={ws.copySelected}
          onPaste={() => ws.pasteClipboard(selectedViewerPage)}
          onExtract={handleExtract}
          onMerge={(bytes) => ws.mergeNewPdf(bytes)}
          onInsert={(bytes) => ws.insertNewPages(selectedViewerPage, bytes)}
          onDownload={ws.downloadPdf}
          onShare={ws.sharePdf}
          onRename={ws.renameDocument}
        />
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 lg:w-72 border-r border-border bg-white overflow-y-auto shrink-0 hidden sm:block">
          <div className="p-3 border-b border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pages</h3>
          </div>
          <ThumbnailGrid
            pages={ws.document.pages}
            pdfBytes={ws.document.pdfBytes}
            selection={ws.selection}
            clipboardPageIndices={ws.clipboard?.pageIndices || []}
            onSelect={handleThumbnailSelect}
            onReorder={ws.reorderSingle}
            onContextMenu={handleContextMenu}
          />
        </div>

        <div className="flex-1 p-4 overflow-auto flex justify-center">
          {currentPage && (
            <div className="relative inline-block">
              {mode === "edit" ? (
                <div className="relative">
                  <PdfViewer
                    pdfBytes={ws.document.pdfBytes}
                    pageIndex={selectedViewerPage}
                  />
                  <EditorCanvas
                    editorState={editor}
                    pageWidth={currentPage.width}
                    pageHeight={currentPage.height}
                    scale={1}
                    pageIndex={selectedViewerPage}
                  />
                </div>
              ) : (
                <PdfViewer
                  pdfBytes={ws.document.pdfBytes}
                  pageIndex={selectedViewerPage}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border p-3 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedViewerPage((p) => Math.max(0, p - 1))}
              disabled={selectedViewerPage === 0}
              className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span className="text-sm font-medium">{selectedViewerPage + 1} / {ws.document.pages.length}</span>
            <button
              onClick={() => setSelectedViewerPage((p) => Math.min(ws.document!.pages.length - 1, p + 1))}
              disabled={selectedViewerPage >= ws.document.pages.length - 1}
              className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
          <button
            onClick={handleSave}
            className="inline-flex items-center h-9 px-4 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary-hover transition-colors"
          >
            {mode === "edit" ? "Save" : "Download"}
          </button>
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          pageIndex={contextMenu.pageIndex}
          hasSelection={ws.selection.size > 0}
          hasClipboard={ws.clipboard !== null}
          onClose={() => setContextMenu(null)}
          onDelete={ws.deleteSelected}
          onRotate={(deg) => ws.rotateSelected(deg)}
          onDuplicate={ws.duplicateSelected}
          onCopy={ws.copySelected}
          onPaste={() => ws.pasteClipboard(contextMenu.pageIndex)}
          onExtract={handleExtract}
          onInsert={handleInsert}
          onReplace={handleReplace}
          onCrop={handleCrop}
        />
      )}

      <ImageDialog open={showImageDialog} onClose={() => setShowImageDialog(false)} onInsert={handleImageInsert} />
      <SignatureDialog open={showSignatureDialog} onClose={() => setShowSignatureDialog(false)} onInsert={handleSignatureInsert} />
      <WatermarkDialog open={showWatermarkDialog} onClose={() => setShowWatermarkDialog(false)} onInsert={handleWatermarkInsert} />
      <PageNumberDialog open={showPageNumberDialog} onClose={() => setShowPageNumberDialog(false)} onInsert={handlePageNumberInsert} />

      {ws.loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm font-medium text-foreground">Processing...</span>
          </div>
        </div>
      )}

      {ws.error && (
        <div className="fixed bottom-4 right-4 bg-danger text-white px-4 py-3 rounded-xl shadow-lg z-50 animate-slide-up max-w-sm">
          <p className="text-sm">{ws.error}</p>
        </div>
      )}
    </div>
  );
}
