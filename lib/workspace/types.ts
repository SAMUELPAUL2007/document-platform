export interface PageInfo {
  index: number;
  width: number;
  height: number;
}

export interface DocumentState {
  pdfBytes: Uint8Array;
  pages: PageInfo[];
  documentName: string;
}

export type Selection = Set<number>;

export interface Clipboard {
  pdfBytes: Uint8Array;
  pageIndices: number[];
}

export interface HistoryEntry {
  pdfBytes: Uint8Array;
  pages: PageInfo[];
  documentName: string;
}

export interface WorkspaceHistory {
  past: HistoryEntry[];
  future: HistoryEntry[];
}

export type WorkspaceAction =
  | { type: "DELETE_PAGES"; indices: number[] }
  | { type: "ROTATE_PAGES"; indices: number[]; degrees: 90 | 180 | 270 }
  | { type: "REORDER_PAGES"; fromIndex: number; toIndex: number }
  | { type: "REORDER_MULTI"; indices: number[]; toIndex: number }
  | { type: "DUPLICATE_PAGES"; indices: number[] }
  | { type: "COPY_PAGES"; indices: number[] }
  | { type: "PASTE_PAGES"; afterIndex: number }
  | { type: "EXTRACT_PAGES"; indices: number[] }
  | { type: "INSERT_PAGES"; afterIndex: number; pdfBytes: Uint8Array }
  | { type: "REPLACE_PAGES"; indices: number[]; replacementPdfBytes: Uint8Array }
  | { type: "MERGE_PDF"; pdfBytes: Uint8Array; position?: number }
  | { type: "RENAME_DOCUMENT"; name: string }
  | { type: "RESTORE"; historyEntry: HistoryEntry };
