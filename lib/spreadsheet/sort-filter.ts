import type { SpreadsheetData, SortOptions } from "./types";

function getCellValue(
  sheet: SpreadsheetData[0],
  ri: number,
  ci: number
): string {
  return sheet.rows?.[ri]?.cells?.[ci]?.text ?? "";
}

export function sortRange(
  data: SpreadsheetData,
  options: SortOptions
): SpreadsheetData {
  const result = JSON.parse(JSON.stringify(data)) as SpreadsheetData;
  const sheet = result[options.sheetIndex];
  if (!sheet?.rows) return result;

  const rows: { ri: number; cells: Record<number, { text: string }> }[] = [];

  for (let r = options.startRow; r <= options.endRow; r++) {
    const cells: Record<number, { text: string }> = {};
    for (let c = options.startCol; c <= options.endCol; c++) {
      cells[c] = { text: getCellValue(sheet, r, c) };
    }
    rows.push({ ri: r, cells });
  }

  const sortCol = options.startCol;
  rows.sort((a, b) => {
    const aVal = getCellValue(sheet, a.ri, sortCol);
    const bVal = getCellValue(sheet, b.ri, sortCol);
    const aNum = Number(aVal);
    const bNum = Number(bVal);

    let comparison: number;
    if (!isNaN(aNum) && !isNaN(bNum)) {
      comparison = aNum - bNum;
    } else {
      comparison = aVal.localeCompare(bVal);
    }

    return options.ascending ? comparison : -comparison;
  });

  for (let r = options.startRow; r <= options.endRow; r++) {
    const rowData = rows[r - options.startRow];
    for (let c = options.startCol; c <= options.endCol; c++) {
      if (!sheet.rows) sheet.rows = {};
      if (!sheet.rows[r]) sheet.rows[r] = { cells: {} };
      if (!sheet.rows[r].cells) sheet.rows[r].cells = {};
      sheet.rows[r].cells[c] = { text: rowData.cells[c]?.text ?? "" };
    }
  }

  return result;
}

export function filterRange(
  data: SpreadsheetData,
  sheetIndex: number,
  headerRow: number,
  colIndex: number,
  filterValue: string
): SpreadsheetData {
  const result = JSON.parse(JSON.stringify(data)) as SpreadsheetData;
  const sheet = result[sheetIndex];
  if (!sheet?.rows) return result;

  let maxRow = 0;
  for (const ri of Object.keys(sheet.rows).map(Number)) {
    if (ri > maxRow) maxRow = ri;
  }

  for (let r = headerRow + 1; r <= maxRow; r++) {
    const cellValue = getCellValue(sheet, r, colIndex);
    const show =
      filterValue === "" ||
      filterValue === "all" ||
      cellValue.toLowerCase().includes(filterValue.toLowerCase());

    if (!show && sheet.rows?.[r]) {
      if (sheet.rows[r].hidden === undefined) {
        sheet.rows[r].hidden = true;
      }
    }
  }

  return result;
}

export function clearFilter(
  data: SpreadsheetData,
  sheetIndex: number
): SpreadsheetData {
  const result = JSON.parse(JSON.stringify(data)) as SpreadsheetData;
  const sheet = result[sheetIndex];
  if (!sheet?.rows) return result;

  for (const ri of Object.keys(sheet.rows).map(Number)) {
    if (sheet.rows[ri]) {
      delete sheet.rows[ri].hidden;
    }
  }

  return result;
}
