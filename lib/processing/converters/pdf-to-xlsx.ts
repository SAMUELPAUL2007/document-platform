import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import * as XLSX from "xlsx";
import type { Converter, ConverterInput, ConverterResult } from "../types";

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

async function extractTextItems(
  pdfBytes: Uint8Array
): Promise<Array<{ pageNumber: number; items: TextItem[] }>> {
  const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const pages: Array<{ pageNumber: number; items: TextItem[] }> = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items: TextItem[] = [];

    for (const item of content.items) {
      if ("str" in item && item.str.trim()) {
        items.push({
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
          height: item.height,
        });
      }
    }

    pages.push({ pageNumber: i, items });
  }

  return pages;
}

function detectTable(
  items: TextItem[],
  yThreshold: number = 5
): string[][] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);

  const rows: TextItem[][] = [];
  let currentRow: TextItem[] = [sorted[0]];
  let currentY = sorted[0].y;

  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i].y - currentY) < yThreshold) {
      currentRow.push(sorted[i]);
    } else {
      currentRow.sort((a, b) => a.x - b.x);
      rows.push(currentRow);
      currentRow = [sorted[i]];
      currentY = sorted[i].y;
    }
  }
  currentRow.sort((a, b) => a.x - b.x);
  rows.push(currentRow);

  const maxCols = Math.max(...rows.map((r) => r.length));
  const table: string[][] = [];

  for (const row of rows) {
    const tableRow: string[] = [];
    for (let c = 0; c < maxCols; c++) {
      tableRow.push(row[c]?.str || "");
    }
    table.push(tableRow);
  }

  return table;
}

const pdfToXlsxConverter: Converter = {
  id: "pdf-to-xlsx",
  acceptedTypes: ["application/pdf"],

  async convert(input: ConverterInput): Promise<ConverterResult> {
    const file = input.files[0];
    if (!file) {
      throw new Error("No file provided");
    }
    const pdfBytes = await readFile(join(input.jobDir, file.storedName));

    const pages = await extractTextItems(new Uint8Array(pdfBytes));
    const wb = XLSX.utils.book_new();

    for (let pi = 0; pi < pages.length; pi++) {
      const page = pages[pi];
      input.onProgress?.({
        percent: Math.round(((pi + 1) / pages.length) * 90),
        stage: "processing",
        current: pi + 1,
        total: pages.length,
        message: `Converting page ${page.pageNumber} to XLSX`,
      });
      const table = detectTable(page.items);

      if (table.length > 0) {
        const ws = XLSX.utils.aoa_to_sheet(table);

        const colWidths = table[0].map((_, ci) => {
          const maxLen = Math.max(
            ...table.map((row) => (row[ci] || "").length)
          );
          return { wch: Math.min(maxLen + 2, 50) };
        });
        ws["!cols"] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, `Page ${page.pageNumber}`);
      } else {
        const lines = page.items
          .sort((a, b) => b.y - a.y || a.x - b.x)
          .map((item) => [item.str]);

        if (lines.length > 0) {
          const ws = XLSX.utils.aoa_to_sheet(lines);
          XLSX.utils.book_append_sheet(wb, ws, `Page ${page.pageNumber}`);
        }
      }
    }

    if (wb.SheetNames.length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([["(No extractable text found)"]]);
      XLSX.utils.book_append_sheet(wb, ws, "Page 1");
    }

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const baseName = file.originalName.replace(/\.pdf$/i, "");
    const outputFileName = `${baseName}.xlsx`;
    const outputPath = join(input.jobDir, outputFileName);
    await writeFile(outputPath, buffer);

    return {
      outputFileName,
      outputMimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      outputPath,
    };
  },
};

export default pdfToXlsxConverter;
