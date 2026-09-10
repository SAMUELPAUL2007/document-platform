import type { SpreadsheetData, SearchResult, SearchOptions } from "./types";

export function searchSpreadsheet(
  data: SpreadsheetData,
  options: SearchOptions,
  _currentSheetIndex: number = 0
): SearchResult[] {
  const results: SearchResult[] = [];
  const query = options.matchCase
    ? options.query
    : options.query.toLowerCase();

  const sheetIndices = options.searchDirection === "forward"
    ? Object.keys(data).map(Number).sort((a, b) => a - b)
    : Object.keys(data).map(Number).sort((a, b) => b - a);

  for (const sheetIdx of sheetIndices) {
    const sheet = data[sheetIdx];
    if (!sheet.rows) continue;

    const rowIndices = options.searchDirection === "forward"
      ? Object.keys(sheet.rows).map(Number).sort((a, b) => a - b)
      : Object.keys(sheet.rows).map(Number).sort((a, b) => b - a);

    for (const ri of rowIndices) {
      const row = sheet.rows[ri];
      if (!row?.cells) continue;

      const colIndices = options.searchDirection === "forward"
        ? Object.keys(row.cells).map(Number).sort((a, b) => a - b)
        : Object.keys(row.cells).map(Number).sort((a, b) => b - a);

      for (const ci of colIndices) {
        const cell = row.cells[ci];
        if (!cell?.text) continue;

        const cellValue = cell.text;
        if (cellValue.startsWith("=") && !options.searchInFormulas) continue;

        const compareValue = options.matchCase
          ? cellValue
          : cellValue.toLowerCase();

        if (options.matchEntireCell) {
          if (compareValue !== query) continue;
        } else {
          if (!compareValue.includes(query)) continue;
        }

        results.push({
          sheetIndex: sheetIdx,
          rowIndex: ri,
          colIndex: ci,
          value: cellValue,
        });
      }
    }
  }

  return results;
}

export function replaceInSpreadsheet(
  data: SpreadsheetData,
  options: SearchOptions
): { data: SpreadsheetData; count: number } {
  const result = JSON.parse(JSON.stringify(data)) as SpreadsheetData;
  const query = options.matchCase
    ? options.query
    : options.query.toLowerCase();
  const replacement = options.replaceWith ?? "";
  let count = 0;

  for (const sheetIdx of Object.keys(result).map(Number)) {
    const sheet = result[sheetIdx];
    if (!sheet.rows) continue;

    for (const ri of Object.keys(sheet.rows).map(Number)) {
      const row = sheet.rows[ri];
      if (!row?.cells) continue;

      for (const ci of Object.keys(row.cells).map(Number)) {
        const cell = row.cells[ci];
        if (!cell?.text) continue;

        if (cell.text.startsWith("=") && !options.searchInFormulas) continue;

        const cellValue = cell.text;
        const compareValue = options.matchCase
          ? cellValue
          : cellValue.toLowerCase();

        const matches = options.matchEntireCell
          ? compareValue === query
          : compareValue.includes(query);

        if (matches) {
          if (options.matchEntireCell) {
            cell.text = replacement;
          } else {
            if (options.matchCase) {
              cell.text = cellValue.split(options.query).join(replacement);
            } else {
              const regex = new RegExp(
                escapeRegex(options.query),
                "gi"
              );
              cell.text = cellValue.replace(regex, replacement);
            }
          }
          count++;
        }
      }
    }
  }

  return { data: result, count };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
