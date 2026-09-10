import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import * as XLSX from "xlsx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Converter, ConverterInput, ConverterResult } from "../types";

const FONT_SIZE = 9;
const HEADER_FONT_SIZE = 10;
const CELL_PADDING = 4;
const ROW_HEIGHT = 16;
const PAGE_MARGIN = 40;
const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;

const xlsxToPdfConverter: Converter = {
  id: "xlsx-to-pdf",
  acceptedTypes: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ],

  async convert(input: ConverterInput): Promise<ConverterResult> {
    const file = input.files[0];
    if (!file) {
      throw new Error("No file provided");
    }
    const buffer = await readFile(join(input.jobDir, file.storedName));

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const usableWidth = PAGE_WIDTH - PAGE_MARGIN * 2;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<string[]>(sheet, {
        header: 1,
        defval: "",
      });

      if (data.length === 0) continue;

      const maxCols = Math.max(...data.map((row) => row.length));
      const colWidth = Math.max(40, usableWidth / maxCols);

      let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      let y = PAGE_HEIGHT - PAGE_MARGIN;

      if (workbook.SheetNames.length > 1) {
        page.drawText(sheetName, {
          x: PAGE_MARGIN,
          y,
          size: 12,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        y -= 20;
      }

      for (let r = 0; r < data.length; r++) {
        const row = data[r];
        if (y < PAGE_MARGIN + ROW_HEIGHT) {
          page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          y = PAGE_HEIGHT - PAGE_MARGIN;
        }

        for (let c = 0; c < maxCols; c++) {
          const cellVal = String(row[c] ?? "");
          const x = PAGE_MARGIN + c * colWidth;
          const isHeader = r === 0;
          const displayFont = isHeader ? boldFont : font;

          let displayText = cellVal;
          const maxWidth = colWidth - CELL_PADDING * 2;
          while (
            displayFont.widthOfTextAtSize(displayText, isHeader ? HEADER_FONT_SIZE : FONT_SIZE) > maxWidth &&
            displayText.length > 1
          ) {
            displayText = displayText.slice(0, -1);
          }
          if (displayText !== cellVal) displayText += "...";

          page.drawText(displayText, {
            x: x + CELL_PADDING,
            y,
            size: isHeader ? HEADER_FONT_SIZE : FONT_SIZE,
            font: displayFont,
            color: rgb(0, 0, 0),
          });
        }

        y -= ROW_HEIGHT;
      }
    }

    const pdfBytes = await pdfDoc.save();
    const baseName = file.originalName.replace(/\.(xlsx?|xls)$/i, "");
    const outputFileName = `${baseName}.pdf`;
    const outputPath = join(input.jobDir, outputFileName);
    await writeFile(outputPath, pdfBytes);

    return {
      outputFileName,
      outputMimeType: "application/pdf",
      outputPath,
    };
  },
};

export default xlsxToPdfConverter;
