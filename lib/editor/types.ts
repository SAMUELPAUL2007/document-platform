export interface EditorDocument {
  html: string;
  title: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocxImportResult {
  html: string;
  title: string;
  error?: string;
}

export interface DocxExportOptions {
  title?: string;
  author?: string;
}

export interface PdfExportOptions {
  pageSize?: "a4" | "letter" | "legal";
  margins?: { top: number; bottom: number; left: number; right: number };
}

export type RibbonTab = "home" | "insert" | "layout" | "references" | "review" | "view";

export interface EditorSettings {
  zoom: number;
  showRuler: boolean;
  showNavigation: boolean;
  showPageNumbers: boolean;
  pageSize: "a4" | "letter" | "legal";
  orientation: "portrait" | "landscape";
  fontFamily: string;
  fontSize: number;
}
