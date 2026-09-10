import mammoth from "mammoth";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import type { DocxImportResult, DocxExportOptions } from "./types";

export async function importDocx(bytes: Uint8Array): Promise<DocxImportResult> {
  try {
    const result = await mammoth.convertToHtml(
      { buffer: Buffer.from(bytes) },
      {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h4:fresh",
          "p[style-name='Heading 5'] => h5:fresh",
          "p[style-name='Heading 6'] => h6:fresh",
          "p[style-name='Title'] => h1.title:fresh",
          "p[style-name='Subtitle'] => h2.subtitle:fresh",
        ],
      }
    );

    let html = result.value;

    html = html.replace(/<table/g, '<table style="border-collapse: collapse; width: 100%;"');
    html = html.replace(/<td/g, '<td style="border: 1px solid #ccc; padding: 8px;"');
    html = html.replace(/<th/g, '<th style="border: 1px solid #ccc; padding: 8px; font-weight: bold;"');

    const title = extractTitle(html);

    return { html, title };
  } catch (err) {
    return {
      html: "<p>Error reading document</p>",
      title: "Untitled",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function extractTitle(html: string): string {
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/);
  if (h1Match) return h1Match[1].replace(/<[^>]+>/g, "");
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/);
  if (titleMatch) return titleMatch[1];
  return "Untitled Document";
}

export async function exportDocx(
  html: string,
  options: DocxExportOptions = {}
): Promise<Uint8Array> {
  const paragraphs = htmlToDocxParagraphs(html);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
    title: options.title || "Document",
    creator: options.author || "Document Editor",
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

function htmlToDocxParagraphs(html: string): (Paragraph | Table)[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const body = doc.body;
  const result: (Paragraph | Table)[] = [];

  function processNode(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (text.trim()) {
        result.push(
          new Paragraph({
            children: [new TextRun({ text })],
          })
        );
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    switch (tag) {
      case "h1":
        result.push(
          new Paragraph({
            children: extractTextRuns(el),
            heading: HeadingLevel.HEADING_1,
          })
        );
        break;
      case "h2":
        result.push(
          new Paragraph({
            children: extractTextRuns(el),
            heading: HeadingLevel.HEADING_2,
          })
        );
        break;
      case "h3":
        result.push(
          new Paragraph({
            children: extractTextRuns(el),
            heading: HeadingLevel.HEADING_3,
          })
        );
        break;
      case "h4":
        result.push(
          new Paragraph({
            children: extractTextRuns(el),
            heading: HeadingLevel.HEADING_4,
          })
        );
        break;
      case "h5":
        result.push(
          new Paragraph({
            children: extractTextRuns(el),
            heading: HeadingLevel.HEADING_5,
          })
        );
        break;
      case "h6":
        result.push(
          new Paragraph({
            children: extractTextRuns(el),
            heading: HeadingLevel.HEADING_6,
          })
        );
        break;
      case "p":
        result.push(
          new Paragraph({
            children: extractTextRuns(el),
            alignment: getAlignment(el),
          })
        );
        break;
      case "br":
        result.push(new Paragraph({ children: [] }));
        break;
      case "table":
        result.push(processTable(el));
        break;
      case "ul":
        el.querySelectorAll(":scope > li").forEach((li) => {
          result.push(
            new Paragraph({
              children: extractTextRuns(li),
              bullet: { level: 0 },
            })
          );
        });
        break;
      case "ol":
        el.querySelectorAll(":scope > li").forEach((li) => {
          result.push(
            new Paragraph({
              children: extractTextRuns(li),
              numbering: { reference: "default-numbering", level: 0 },
            })
          );
        });
        break;
      case "hr":
        result.push(
          new Paragraph({
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
            },
          })
        );
        break;
      case "img":
        break;
      default:
        for (const child of Array.from(el.childNodes)) {
          processNode(child);
        }
    }
  }

  function extractTextRuns(el: Element): TextRun[] {
    const runs: TextRun[] = [];

    function walk(node: Node): void {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        if (text) {
          const parent = node.parentElement;
          const isBold =
            parent?.tagName === "B" ||
            parent?.tagName === "STRONG" ||
            getComputedStyle(parent as Element).fontWeight === "bold";
          const isItalic =
            parent?.tagName === "I" ||
            parent?.tagName === "EM" ||
            getComputedStyle(parent as Element).fontStyle === "italic";
          const isUnderline = parent?.tagName === "U";

          const style: Record<string, unknown> = {};
          if (isBold) style.bold = true;
          if (isItalic) style.italics = true;
          if (isUnderline) style.underline = {};

          runs.push(new TextRun({ text, ...style }));
        }
        return;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        for (const child of Array.from(node.childNodes)) {
          walk(child);
        }
      }
    }

    walk(el);
    return runs.length > 0 ? runs : [new TextRun({ text: el.textContent || "" })];
  }

  function processTable(tableEl: Element): Table {
    const rows: TableRow[] = [];
    const trElements = tableEl.querySelectorAll("tr");

    trElements.forEach((tr) => {
      const cells: TableCell[] = [];
      tr.querySelectorAll("td, th").forEach((cell) => {
        cells.push(
          new TableCell({
            children: [
              new Paragraph({
                children: extractTextRuns(cell),
              }),
            ],
            width: { size: 100 / Math.max(tr.querySelectorAll("td, th").length, 1), type: WidthType.PERCENTAGE },
          })
        );
      });
      rows.push(new TableRow({ children: cells }));
    });

    return new Table({
      rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    });
  }

  function getAlignment(el: Element): typeof AlignmentType[keyof typeof AlignmentType] {
    const style = el.getAttribute("style") || "";
    if (style.includes("text-align: center") || style.includes("text-align:center"))
      return AlignmentType.CENTER;
    if (style.includes("text-align: right") || style.includes("text-align:right"))
      return AlignmentType.RIGHT;
    if (style.includes("text-align: justify") || style.includes("text-align:justify"))
      return AlignmentType.JUSTIFIED;
    return AlignmentType.LEFT;
  }

  for (const child of Array.from(body.childNodes)) {
    processNode(child);
  }

  if (result.length === 0) {
    result.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
  }

  return result;
}
