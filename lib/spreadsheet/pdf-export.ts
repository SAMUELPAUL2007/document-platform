import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { SpreadsheetData } from "./types";

function getCellDisplayValue(
  sheet: SpreadsheetData[0],
  ri: number,
  ci: number
): string {
  return sheet.rows?.[ri]?.cells?.[ci]?.text ?? "";
}

function getColCount(sheet: SpreadsheetData[0]): number {
  let max = 0;
  if (sheet.rows) {
    for (const ri of Object.keys(sheet.rows)) {
      const row = sheet.rows[Number(ri)];
      if (row?.cells) {
        for (const ci of Object.keys(row.cells)) {
          if (Number(ci) > max) max = Number(ci);
        }
      }
    }
  }
  return max + 1;
}

function getRowCount(sheet: SpreadsheetData[0]): number {
  let max = 0;
  if (sheet.rows) {
    for (const ri of Object.keys(sheet.rows)) {
      if (Number(ri) > max) max = Number(ri);
    }
  }
  return max + 1;
}

export async function exportSpreadsheetToPdf(
  data: SpreadsheetData,
  options?: { fileName?: string; pageSize?: "a4" | "letter" | "legal" }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth =
    options?.pageSize === "letter"
      ? 612
      : options?.pageSize === "legal"
        ? 612
        : 595.28;
  const pageHeight =
    options?.pageSize === "letter"
      ? 792
      : options?.pageSize === "legal"
        ? 1008
        : 841.89;

  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  const cellPadding = 4;
  const defaultFontSize = 9;
  const headerHeight = 18;
  const rowMinHeight = 16;

  const sortedKeys = Object.keys(data)
    .map(Number)
    .sort((a, b) => a - b);

  for (const idx of sortedKeys) {
    const sheet = data[idx];
    const rowCount = getRowCount(sheet);
    const colCount = getColCount(sheet);

    if (colCount === 0 && rowCount === 0) continue;

    const defaultColWidth = contentWidth / Math.max(colCount, 1);

    const colWidths: number[] = [];
    for (let c = 0; c < colCount; c++) {
      const customWidth = sheet.cols?.[c]?.width;
      colWidths.push(customWidth ? customWidth * 0.75 : defaultColWidth);
    }

    let currentY = pageHeight - margin;
    let page = pdfDoc.addPage([pageWidth, pageHeight]);

    const drawHeader = () => {
      currentY -= headerHeight;
      const sheetLabel = `Sheet: ${sheet.name || `Sheet${idx + 1}`}`;
      page.drawText(sheetLabel, {
        x: margin,
        y: currentY,
        size: 11,
        font: boldFont,
        color: rgb(0.15, 0.15, 0.15),
      });
      currentY -= 4;
      page.drawLine({
        start: { x: margin, y: currentY },
        end: { x: pageWidth - margin, y: currentY },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
      currentY -= 10;
    };

    drawHeader();

    for (let r = 0; r < rowCount; r++) {
      const lineTexts: string[] = [];
      let maxTextHeight = rowMinHeight;

      for (let c = 0; c < colCount; c++) {
        const value = getCellDisplayValue(sheet, r, c);
        lineTexts.push(value);
        const textWidth = font.widthOfTextAtSize(value, defaultFontSize);
        const linesNeeded = Math.max(
          1,
          Math.ceil(textWidth / (colWidths[c] - cellPadding * 2))
        );
        const textH = linesNeeded * (defaultFontSize + 2) + cellPadding * 2;
        if (textH > maxTextHeight) maxTextHeight = textH;
      }

      if (currentY - maxTextHeight < margin) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin;
        drawHeader();
      }

      if (r % 2 === 0) {
        page.drawRectangle({
          x: margin,
          y: currentY - maxTextHeight,
          width: contentWidth,
          height: maxTextHeight,
          color: rgb(0.97, 0.97, 0.97),
        });
      }

      let xPos = margin;
      for (let c = 0; c < colCount; c++) {
        const value = lineTexts[c];
        if (value) {
          const maxTextWidth = colWidths[c] - cellPadding * 2;
          let displayText = value;
          while (
            font.widthOfTextAtSize(displayText, defaultFontSize) >
              maxTextWidth &&
            displayText.length > 1
          ) {
            displayText = displayText.slice(0, -1);
          }
          if (displayText !== value) displayText += "...";

          page.drawText(displayText, {
            x: xPos + cellPadding,
            y: currentY - defaultFontSize - cellPadding,
            size: defaultFontSize,
            font,
            color: rgb(0.1, 0.1, 0.1),
          });
        }
        xPos += colWidths[c];
      }

      page.drawLine({
        start: { x: margin, y: currentY - maxTextHeight },
        end: { x: pageWidth - margin, y: currentY - maxTextHeight },
        thickness: 0.3,
        color: rgb(0.85, 0.85, 0.85),
      });

      currentY -= maxTextHeight;
    }
  }

  return pdfDoc.save();
}
