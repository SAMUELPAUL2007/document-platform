import * as XLSX from "xlsx";
import type { SpreadsheetData, SpreadsheetCell, SpreadsheetSheet } from "./types";

export function importXlsxToData(buffer: ArrayBuffer): {
  data: SpreadsheetData;
  sheetNames: string[];
} {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const data: SpreadsheetData = {};
  const sheetNames: string[] = [];

  workbook.SheetNames.forEach((name, idx) => {
    sheetNames.push(name);
    const worksheet = workbook.Sheets[name];
    const ref = worksheet["!ref"];
    if (!ref) {
      data[idx] = { name };
      return;
    }
    const range = XLSX.utils.decode_range(ref);

    const rows: SpreadsheetSheet["rows"] = {};
    const merges: string[] = [];

    if (worksheet["!merges"]) {
      worksheet["!merges"].forEach((merge) => {
        const start = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
        const end = XLSX.utils.encode_cell({ r: merge.e.r, c: merge.e.c });
        merges.push(`${start}:${end}`);
      });
    }

    for (let r = range.s.r; r <= range.e.r; r++) {
      const cells: Record<number, SpreadsheetCell> = {};
      let hasContent = false;

      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[addr];
        if (!cell) continue;

        hasContent = true;
        let text = "";

        if (cell.t === "b") {
          text = cell.w || (cell.v ? "TRUE" : "FALSE");
        } else if (cell.t === "d") {
          text = cell.w || String(cell.v || "");
        } else if (cell.t === "n") {
          text = cell.w !== undefined ? cell.w : String(cell.v ?? "");
        } else {
          text = String(cell.v ?? cell.w ?? "");
        }

        cells[c] = { text };
      }

      if (hasContent) {
        rows[r] = { cells };
      }
    }

    const colWidths: Record<number, { width?: number }> = {};
    if (worksheet["!cols"]) {
      worksheet["!cols"].forEach((col, ci) => {
        if (col.wch) {
          colWidths[ci] = { width: Math.max(60, Math.round(col.wch * 7.5)) };
        } else if (col.wpx) {
          colWidths[ci] = { width: col.wpx };
        }
      });
    }

    const sheetData: SpreadsheetSheet = { name };
    if (Object.keys(rows).length > 0) sheetData.rows = rows;
    if (merges.length > 0) sheetData.merges = merges;
    if (Object.keys(colWidths).length > 0) {
      sheetData.cols = { len: range.e.c + 1, ...colWidths };
    }

    data[idx] = sheetData;
  });

  return { data, sheetNames };
}

export function exportDataToXlsx(
  data: SpreadsheetData,
  _options?: { fileName?: string } // eslint-disable-line @typescript-eslint/no-unused-vars
): Uint8Array {
  const workbook = XLSX.utils.book_new();

  const sortedKeys = Object.keys(data)
    .map(Number)
    .sort((a, b) => a - b);

  sortedKeys.forEach((idx) => {
    const sheet = data[idx];
    const sheetName = sheet.name || `Sheet${idx + 1}`;

    let maxRow = 0;
    let maxCol = 0;

    if (sheet.rows) {
      Object.keys(sheet.rows).forEach((r) => {
        const ri = Number(r);
        if (ri > maxRow) maxRow = ri;
        const row = sheet.rows![ri];
        if (row?.cells) {
          Object.keys(row.cells).forEach((c) => {
            const ci = Number(c);
            if (ci > maxCol) maxCol = ci;
          });
        }
      });
    }

    if (maxRow === 0 && maxCol === 0 && (!sheet.rows || Object.keys(sheet.rows).length === 0)) {
      const ws = XLSX.utils.aoa_to_sheet([]);
      XLSX.utils.book_append_sheet(workbook, ws, sheetName);
      return;
    }

    const aoa: (string | number | boolean | null)[][] = [];
    for (let r = 0; r <= maxRow; r++) {
      const row: (string | number | boolean | null)[] = [];
      for (let c = 0; c <= maxCol; c++) {
        const cell = sheet.rows?.[r]?.cells?.[c];
        if (cell) {
          const num = Number(cell.text);
          if (!isNaN(num) && cell.text.trim() !== "") {
            row.push(num);
          } else if (cell.text === "TRUE" || cell.text === "FALSE") {
            row.push(cell.text === "TRUE");
          } else {
            row.push(cell.text || null);
          }
        } else {
          row.push(null);
        }
      }
      aoa.push(row);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    if (sheet.merges && sheet.merges.length > 0) {
      ws["!merges"] = sheet.merges.map((m) => {
        const parts = m.split(":");
        const start = XLSX.utils.decode_cell(parts[0]);
        const end = XLSX.utils.decode_cell(parts[1]);
        return { s: { r: start.r, c: start.c }, e: { r: end.r, c: end.c } };
      });
    }

    if (sheet.cols) {
      const cols: XLSX.ColInfo[] = [];
      const colKeys = Object.keys(sheet.cols)
        .map(Number)
        .filter((k) => !isNaN(k))
        .sort((a, b) => a - b);
      colKeys.forEach((ci) => {
        const w = sheet.cols![ci]?.width;
        if (w) {
          while (cols.length < ci) cols.push({});
          cols.push({ wch: w / 7.5 });
        }
      });
      if (cols.length > 0) ws["!cols"] = cols;
    }

    const safeName = sheetName.replace(/[\\/?*\[\]]+/g, "_").substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, ws, safeName);
  });

  return new Uint8Array(XLSX.write(workbook, { type: "array", bookType: "xlsx" }));
}
