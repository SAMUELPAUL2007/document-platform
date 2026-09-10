import { PDFDocument, StandardFonts, rgb, degrees, RotationTypes } from "pdf-lib";
import type { DocumentState } from "./types";

const FONT_MAP: Record<string, string> = {
  Helvetica: "Helvetica",
  "Helvetica-Bold": "HelveticaBold",
  "Helvetica-Oblique": "HelveticaOblique",
  "Helvetica-BoldOblique": "HelveticaBoldOblique",
  "Times-Roman": "TimesRoman",
  "Times-Bold": "TimesRomanBold",
  "Times-Italic": "TimesRomanItalic",
  "Times-BoldItalic": "TimesRomanBoldItalic",
  Courier: "Courier",
  "Courier-Bold": "CourierBold",
  "Courier-Oblique": "CourierOblique",
  "Courier-BoldOblique": "CourierBoldOblique",
};

function getStdFont(family: string, weight: string, style: string): any {
  let name = family;
  if (weight === "bold" && style === "italic") name = `${family}-BoldOblique`;
  else if (weight === "bold") name = `${family}-Bold`;
  else if (style === "italic") name = `${family}-Oblique`;

  const mapped = FONT_MAP[name] || FONT_MAP[family] || "Helvetica";
  return (StandardFonts as Record<string, any>)[mapped] || StandardFonts.Helvetica;
}

function parseColor(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return { r, g, b };
}

async function renderTextObject(page: any, obj: any, pageHeight: number, pdfDoc: any) {
  const fontEnum = getStdFont(obj.fontFamily, obj.fontWeight, obj.fontStyle);
  const pdfFont = await pdfDoc.embedFont(fontEnum);
  const color = parseColor(obj.color);
  const pdfY = pageHeight - obj.y - obj.height;
  const lines = (obj.text || "").split("\n");

  lines.forEach((line: string, i: number) => {
    if (line.trim() === "") return;
    const textWidth = pdfFont.widthOfTextAtSize(line, obj.fontSize);
    let x = obj.x;
    if (obj.textAlign === "center") {
      x = obj.x + (obj.width - textWidth) / 2;
    } else if (obj.textAlign === "right") {
      x = obj.x + obj.width - textWidth;
    }
    const lineY = pdfY + obj.height - (i + 1) * obj.fontSize * (obj.lineHeight || 1.2);
    page.drawText(line, {
      x,
      y: lineY,
      size: obj.fontSize,
      font: pdfFont,
      color: rgb(color.r, color.g, color.b),
      opacity: obj.opacity,
    });
  });
}

function renderDrawingObject(page: any, obj: any, pageHeight: number) {
  if (!obj.points || obj.points.length < 2) return;
  const color = parseColor(obj.strokeColor);
  for (let i = 0; i < obj.points.length - 1; i++) {
    const p1 = obj.points[i];
    const p2 = obj.points[i + 1];
    page.drawLine({
      start: { x: p1.x, y: pageHeight - p1.y },
      end: { x: p2.x, y: pageHeight - p2.y },
      thickness: obj.strokeWidth,
      color: rgb(color.r, color.g, color.b),
      opacity: obj.opacity,
    });
  }
}

function renderHighlightObject(page: any, obj: any, pageHeight: number) {
  const color = parseColor(obj.color);
  const pdfY = pageHeight - obj.y - obj.height;

  if (obj.type === "underline") {
    page.drawLine({
      start: { x: obj.x, y: pdfY },
      end: { x: obj.x + obj.width, y: pdfY },
      thickness: 2,
      color: rgb(color.r, color.g, color.b),
      opacity: obj.opacity,
    });
  } else if (obj.type === "strikethrough") {
    const midY = pdfY + obj.height / 2;
    page.drawLine({
      start: { x: obj.x, y: midY },
      end: { x: obj.x + obj.width, y: midY },
      thickness: 2,
      color: rgb(color.r, color.g, color.b),
      opacity: obj.opacity,
    });
  } else {
    page.drawRectangle({
      x: obj.x,
      y: pdfY,
      width: obj.width,
      height: obj.height,
      color: rgb(color.r, color.g, color.b),
      opacity: obj.opacity * 0.3,
    });
  }
}

function renderShapeObject(page: any, obj: any, pageHeight: number) {
  const strokeColor = parseColor(obj.strokeColor);
  const fillColor = obj.fillColor === "transparent" ? undefined : parseColor(obj.fillColor);
  const pdfY = pageHeight - obj.y - obj.height;

  if (obj.type === "rectangle") {
    page.drawRectangle({
      x: obj.x,
      y: pdfY,
      width: obj.width,
      height: obj.height,
      borderColor: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
      borderWidth: obj.strokeWidth,
      color: fillColor ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined,
      opacity: obj.opacity,
    });
  } else if (obj.type === "ellipse") {
    page.drawEllipse({
      x: obj.x + obj.width / 2,
      y: pdfY + obj.height / 2,
      xScale: obj.width / 2,
      yScale: obj.height / 2,
      borderColor: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
      borderWidth: obj.strokeWidth,
      color: fillColor ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined,
      opacity: obj.opacity,
    });
  } else if (obj.type === "line") {
    page.drawLine({
      start: { x: obj.x, y: pageHeight - obj.y },
      end: { x: obj.x + obj.width, y: pageHeight - obj.y - obj.height },
      thickness: obj.strokeWidth,
      color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
      opacity: obj.opacity,
    });
  }
}

function renderArrowObject(page: any, obj: any, pageHeight: number) {
  const color = parseColor(obj.strokeColor);
  const headSize = 10;

  page.drawLine({
    start: { x: obj.startX, y: pageHeight - obj.startY },
    end: { x: obj.endX, y: pageHeight - obj.endY },
    thickness: obj.strokeWidth,
    color: rgb(color.r, color.g, color.b),
    opacity: obj.opacity,
  });

  const angle = Math.atan2(obj.endY - obj.startY, obj.endX - obj.startX);
  const a1x = obj.endX - headSize * Math.cos(angle - Math.PI / 6);
  const a1y = obj.endY - headSize * Math.sin(angle - Math.PI / 6);
  const a2x = obj.endX - headSize * Math.cos(angle + Math.PI / 6);
  const a2y = obj.endY - headSize * Math.sin(angle + Math.PI / 6);

  page.drawLine({
    start: { x: obj.endX, y: pageHeight - obj.endY },
    end: { x: a1x, y: pageHeight - a1y },
    thickness: obj.strokeWidth,
    color: rgb(color.r, color.g, color.b),
    opacity: obj.opacity,
  });
  page.drawLine({
    start: { x: obj.endX, y: pageHeight - obj.endY },
    end: { x: a2x, y: pageHeight - a2y },
    thickness: obj.strokeWidth,
    color: rgb(color.r, color.g, color.b),
    opacity: obj.opacity,
  });
}

async function renderImageObject(page: any, obj: any, pdfDoc: any, pageHeight: number) {
  try {
    const bytes = obj.imageBytes || obj.signatureBytes;
    if (!bytes || bytes.length === 0) return;
    let image;
    if (obj.mimeType && obj.mimeType.includes("png")) {
      image = await pdfDoc.embedPng(bytes);
    } else {
      image = await pdfDoc.embedJpg(bytes);
    }
    const pdfY = pageHeight - obj.y - obj.height;
    page.drawImage(image, {
      x: obj.x,
      y: pdfY,
      width: obj.width,
      height: obj.height,
      opacity: obj.opacity,
    });
  } catch {
    // skip invalid images
  }
}

async function renderWatermarkObject(page: any, obj: any, pageHeight: number, _totalPages: number, pdfDoc: any) {
  if (obj.variant === "text" && obj.text) {
    const color = parseColor(obj.color || "#cccccc");
    const fontSize = obj.fontSize || 48;
    const fontEnum = getStdFont(obj.fontFamily || "Helvetica", "normal", "normal");
    const pdfFont = await pdfDoc.embedFont(fontEnum);

    const centerX = 297.64;
    const centerY = pageHeight / 2;
    const textWidth = pdfFont.widthOfTextAtSize(obj.text, fontSize);

    page.drawText(obj.text, {
      x: centerX - textWidth / 2,
      y: centerY,
      size: fontSize,
      font: pdfFont,
      color: rgb(color.r, color.g, color.b),
      opacity: obj.opacity,
      rotate: degrees(obj.rotation || -45),
    });
  }
}

async function renderPageNumberObject(page: any, obj: any, pageIndex: number, totalPages: number, pageHeight: number, pdfDoc: any) {
  let text = obj.text || "{page}";
  text = text.replace("{page}", String(pageIndex + 1));
  text = text.replace("{total}", String(totalPages));

  const fontEnum = getStdFont(obj.fontFamily || "Helvetica", "normal", "normal");
  const pdfFont = await pdfDoc.embedFont(fontEnum);
  const color = parseColor(obj.color || "#000000");
  const textWidth = pdfFont.widthOfTextAtSize(text, obj.fontSize);

  page.drawText(text, {
    x: obj.x,
    y: pageHeight - obj.y - obj.fontSize,
    size: obj.fontSize,
    font: pdfFont,
    color: rgb(color.r, color.g, color.b),
    opacity: obj.opacity,
  });
}

export async function bakeObjectsIntoPdf(
  state: DocumentState,
  objects: any[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(state.pdfBytes, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  const objectsByPage = new Map<number, any[]>();
  for (const obj of objects) {
    const existing = objectsByPage.get(obj.pageIndex) || [];
    existing.push(obj);
    objectsByPage.set(obj.pageIndex, existing);
  }

  const totalPages = pages.length;

  for (const [pageIndex, pageObjects] of objectsByPage) {
    if (pageIndex >= pages.length) continue;
    const page = pages[pageIndex];
    const pageHeight = page.getHeight();
    const sorted = [...pageObjects].sort((a: any, b: any) => a.zIndex - b.zIndex);

    for (const obj of sorted) {
      switch (obj.type) {
        case "text":
          await renderTextObject(page, obj, pageHeight, pdfDoc);
          break;
        case "drawing":
          renderDrawingObject(page, obj, pageHeight);
          break;
        case "highlight":
        case "underline":
        case "strikethrough":
          await renderHighlightObject(page, obj, pageHeight);
          break;
        case "rectangle":
        case "ellipse":
        case "line":
          await renderShapeObject(page, obj, pageHeight);
          break;
        case "arrow":
          renderArrowObject(page, obj, pageHeight);
          break;
        case "image":
        case "signature":
          await renderImageObject(page, obj, pdfDoc, pageHeight);
          break;
        case "watermark":
          await renderWatermarkObject(page, obj, pageHeight, totalPages, pdfDoc);
          break;
        case "page-number":
          await renderPageNumberObject(page, obj, pageIndex, totalPages, pageHeight, pdfDoc);
          break;
      }
    }
  }

  return pdfDoc.save();
}
