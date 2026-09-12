import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { PdfExportOptions } from "./types";

export async function exportPdf(
  html: string,
  options: PdfExportOptions = {}
): Promise<Uint8Array> {
  const { pageSize = "a4", margins = { top: 72, bottom: 72, left: 72, right: 72 } } = options;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const pageDims = getPageDimensions(pageSize);
  const contentWidth = pageDims.width - margins.left - margins.right;
  const lineHeight = 14;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const body = doc.body;

  let currentPage = pdfDoc.addPage([pageDims.width, pageDims.height]);
  let y = pageDims.height - margins.top;

  const blocks = extractBlocks(body);

  for (const block of blocks) {
    const lines = wrapText(block.text, font, block.fontSize, contentWidth);

    for (const line of lines) {
      if (y < margins.bottom + lineHeight) {
        currentPage = pdfDoc.addPage([pageDims.width, pageDims.height]);
        y = pageDims.height - margins.top;
      }

      const selectedFont = block.bold ? boldFont : block.italic ? italicFont : font;
      currentPage.drawText(line, {
        x: margins.left,
        y,
        size: block.fontSize,
        font: selectedFont,
        color: rgb(0, 0, 0),
      });

      y -= lineHeight;
    }

    y -= block.spacing;
  }

  return pdfDoc.save();
}

function getPageDimensions(size: string): { width: number; height: number } {
  switch (size) {
    case "letter":
      return { width: 612, height: 792 };
    case "legal":
      return { width: 612, height: 1008 };
    case "a4":
    default:
      return { width: 595.28, height: 841.89 };
  }
}

interface Block {
  text: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  spacing: number;
}

function extractBlocks(body: HTMLElement): Block[] {
  const blocks: Block[] = [];

  function walk(el: Node, listIndex: number = 0, inList: boolean = false): void {
    if (el.nodeType === Node.TEXT_NODE) {
      const text = el.textContent || "";
      if (text.trim()) {
        const prefix = inList ? `${listIndex}. ` : "";
        blocks.push({
          text: prefix + text,
          fontSize: 12,
          bold: false,
          italic: false,
          spacing: 4,
        });
      }
      return;
    }

    if (el.nodeType !== Node.ELEMENT_NODE) return;

    const element = el as Element;
    const tag = element.tagName.toLowerCase();

    let fontSize = 12;
    let bold = false;
    let italic = false;
    let spacing = 4;

    if (tag === "h1") { fontSize = 24; bold = true; spacing = 12; }
    else if (tag === "h2") { fontSize = 20; bold = true; spacing = 10; }
    else if (tag === "h3") { fontSize = 16; bold = true; spacing = 8; }
    else if (tag === "h4") { fontSize = 14; bold = true; spacing = 6; }
    else if (tag === "h5") { fontSize = 12; bold = true; spacing = 4; }
    else if (tag === "h6") { fontSize = 11; bold = true; spacing = 4; }
    else if (tag === "p") { spacing = 8; }
    else if (tag === "li") { spacing = 2; }
    else if (tag === "hr") {
      blocks.push({ text: "─".repeat(80), fontSize: 8, bold: false, italic: false, spacing: 8 });
      return;
    }

    if (tag === "b" || tag === "strong") bold = true;
    if (tag === "i" || tag === "em") italic = true;

    if (tag === "table") {
      const rows = element.querySelectorAll("tr");
      rows.forEach((row, rowIdx) => {
        const cells = row.querySelectorAll("td, th");
        const cellTexts: string[] = [];
        cells.forEach((cell) => {
          cellTexts.push(cell.textContent?.trim() || "");
        });
        if (cellTexts.length > 0) {
          const isHeader = row.querySelector("th") !== null;
          blocks.push({
            text: cellTexts.join(" | "),
            fontSize: 11,
            bold: isHeader,
            italic: false,
            spacing: 2,
          });
        }
      });
      blocks.push({ text: "", fontSize: 8, bold: false, italic: false, spacing: 8 });
      return;
    }

    const text = element.textContent || "";
    if (text.trim() && !["ul", "ol", "thead", "tbody", "tfoot"].includes(tag)) {
      blocks.push({ text: text.trim(), fontSize, bold, italic, spacing });
    }

    if (tag === "ol") {
      let idx = 1;
      for (const child of Array.from(element.childNodes)) {
        if (child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName.toLowerCase() === "li") {
          walk(child, idx, true);
          idx++;
        } else {
          walk(child, 0, false);
        }
      }
    } else if (tag === "ul") {
      for (const child of Array.from(element.childNodes)) {
        if (child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName.toLowerCase() === "li") {
          const liText = child.textContent?.trim() || "";
          if (liText) {
            blocks.push({
              text: `• ${liText}`,
              fontSize: 12,
              bold: false,
              italic: false,
              spacing: 2,
            });
          }
        } else {
          walk(child, 0, false);
        }
      }
    } else {
      for (const child of Array.from(element.childNodes)) {
        walk(child, listIndex, inList);
      }
    }
  }

  for (const child of Array.from(body.childNodes)) {
    walk(child);
  }

  return blocks;
}

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}
