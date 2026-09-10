export interface SpreadsheetCell {
  text: string;
  style?: number;
  merge?: [number, number];
}

export interface SpreadsheetRow {
  cells: Record<number, SpreadsheetCell>;
  hidden?: boolean;
}

export interface SpreadsheetSheet {
  name?: string;
  freeze?: string;
  styles?: SpreadsheetStyle[];
  merges?: string[];
  cols?: {
    len?: number;
    [key: number]: { width?: number };
  };
  rows?: Record<number, SpreadsheetRow>;
}

export interface SpreadsheetData {
  [index: number]: SpreadsheetSheet;
}

export interface SpreadsheetStyle {
  align?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
  font?: {
    name?: string;
    size?: number;
    bold?: boolean;
    italic?: boolean;
  };
  strike?: boolean;
  underline?: boolean;
  color?: string;
  bgcolor?: string;
  textwrap?: boolean;
  border?: {
    top?: string[];
    right?: string[];
    bottom?: string[];
    left?: string[];
  };
}

export interface ImportOptions {
  fileName: string;
  buffer: ArrayBuffer;
}

export interface ExportOptions {
  fileName?: string;
  sheetName?: string;
}

export interface SearchOptions {
  query: string;
  replaceWith?: string;
  matchCase: boolean;
  matchEntireCell: boolean;
  searchInFormulas: boolean;
  searchDirection: "forward" | "backward";
}

export interface SearchResult {
  sheetIndex: number;
  rowIndex: number;
  colIndex: number;
  value: string;
}

export interface SortOptions {
  sheetIndex: number;
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  ascending: boolean;
}

export interface NumberFormat {
  id: string;
  label: string;
  format: string;
}

export const NUMBER_FORMATS: NumberFormat[] = [
  { id: "general", label: "General", format: "" },
  { id: "number", label: "Number", format: "#,##0.00" },
  { id: "currency", label: "Currency", format: "$#,##0.00" },
  { id: "percent", label: "Percent", format: "0.00%" },
  { id: "date", label: "Date", format: "MM/DD/YYYY" },
  { id: "time", label: "Time", format: "HH:MM:SS" },
  { id: "scientific", label: "Scientific", format: "0.00E+00" },
  { id: "text", label: "Text", format: "@" },
  { id: "integer", label: "Integer", format: "#,##0" },
];
