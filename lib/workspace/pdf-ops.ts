import { PDFDocument, RotationTypes } from "pdf-lib";
import type { PageInfo, DocumentState } from "./types";

export async function loadPdfFromBytes(
  bytes: Uint8Array
): Promise<DocumentState> {
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = pdfDoc.getPages().map((page, i) => ({
    index: i,
    width: page.getWidth(),
    height: page.getHeight(),
  }));

  return {
    pdfBytes: new Uint8Array(bytes),
    pages,
    documentName: "document",
  };
}

export async function getPagesInfo(
  bytes: Uint8Array
): Promise<PageInfo[]> {
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return pdfDoc.getPages().map((page, i) => ({
    index: i,
    width: page.getWidth(),
    height: page.getHeight(),
  }));
}

export async function deletePages(
  state: DocumentState,
  indices: number[]
): Promise<Uint8Array> {
  if (indices.length === 0) return state.pdfBytes;
  const pdfDoc = await PDFDocument.load(state.pdfBytes, { ignoreEncryption: true });
  const sorted = [...indices].sort((a, b) => b - a);
  for (const i of sorted) {
    pdfDoc.removePage(i);
  }
  return pdfDoc.save();
}

export async function rotatePages(
  state: DocumentState,
  indices: number[],
  degrees: 90 | 180 | 270
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(state.pdfBytes, { ignoreEncryption: true });
  for (const i of indices) {
    const page = pdfDoc.getPage(i);
    const currentAngle = page.getRotation().angle;
    page.setRotation({ angle: currentAngle + degrees, type: RotationTypes.Degrees });
  }
  return pdfDoc.save();
}

export async function reorderPage(
  state: DocumentState,
  fromIndex: number,
  toIndex: number
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(state.pdfBytes, { ignoreEncryption: true });
  const [copied] = await pdfDoc.copyPages(pdfDoc, [fromIndex]);
  pdfDoc.removePage(fromIndex);
  const insertAt = Math.min(toIndex, pdfDoc.getPageCount());
  pdfDoc.insertPage(insertAt, copied);
  return pdfDoc.save();
}

export async function reorderPagesMulti(
  state: DocumentState,
  selectedIndices: number[],
  toIndex: number
): Promise<Uint8Array> {
  if (selectedIndices.length === 0) return state.pdfBytes;

  const sortedAsc = [...selectedIndices].sort((a, b) => a - b);
  let result = state.pdfBytes;

  for (let i = sortedAsc.length - 1; i >= 0; i--) {
    const idx = sortedAsc[i];
    const tempDoc = await PDFDocument.load(result, { ignoreEncryption: true });
    const [copied] = await tempDoc.copyPages(tempDoc, [idx]);
    tempDoc.removePage(idx);
    const adjusted = toIndex > idx ? toIndex - 1 : toIndex;
    const insertAt = Math.min(adjusted, tempDoc.getPageCount());
    tempDoc.insertPage(insertAt, copied);
    result = await tempDoc.save();
  }

  return result;
}

export async function duplicatePages(
  state: DocumentState,
  indices: number[]
): Promise<Uint8Array> {
  if (indices.length === 0) return state.pdfBytes;

  const pdfDoc = await PDFDocument.load(state.pdfBytes, { ignoreEncryption: true });
  const sortedAsc = [...indices].sort((a, b) => a - b);
  const copies = await pdfDoc.copyPages(pdfDoc, sortedAsc);

  for (let i = 0; i < sortedAsc.length; i++) {
    const insertAt = sortedAsc[i] + i + 1;
    pdfDoc.insertPage(insertAt, copies[i]);
  }

  return pdfDoc.save();
}

export async function extractPages(
  state: DocumentState,
  indices: number[]
): Promise<Uint8Array> {
  const newDoc = await PDFDocument.create();
  const srcDoc = await PDFDocument.load(state.pdfBytes, { ignoreEncryption: true });
  const copiedPages = await newDoc.copyPages(srcDoc, indices);
  for (const page of copiedPages) {
    newDoc.addPage(page);
  }
  return newDoc.save();
}

export async function insertPages(
  state: DocumentState,
  afterIndex: number,
  insertBytes: Uint8Array
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(state.pdfBytes, { ignoreEncryption: true });
  const insertDoc = await PDFDocument.load(insertBytes, { ignoreEncryption: true });
  const copiedPages = await pdfDoc.copyPages(insertDoc, insertDoc.getPageIndices());

  const insertAt = Math.min(afterIndex + 1, pdfDoc.getPageCount());
  for (let i = 0; i < copiedPages.length; i++) {
    pdfDoc.insertPage(insertAt + i, copiedPages[i]);
  }

  return pdfDoc.save();
}

export async function replacePages(
  state: DocumentState,
  indices: number[],
  replacementBytes: Uint8Array
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(state.pdfBytes, { ignoreEncryption: true });
  const replDoc = await PDFDocument.load(replacementBytes, { ignoreEncryption: true });

  const sortedDesc = [...indices].sort((a, b) => b - a);
  const sortedAsc = [...indices].sort((a, b) => a - b);

  const replacementCopies = await pdfDoc.copyPages(
    replDoc,
    replDoc.getPageIndices().slice(0, indices.length)
  );

  for (const i of sortedDesc) {
    pdfDoc.removePage(i);
  }

  const insertAt = Math.min(sortedAsc[0], pdfDoc.getPageCount());
  for (let i = 0; i < replacementCopies.length; i++) {
    pdfDoc.insertPage(insertAt + i, replacementCopies[i]);
  }

  return pdfDoc.save();
}

export async function mergePdf(
  state: DocumentState,
  mergeBytes: Uint8Array,
  position?: number
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(state.pdfBytes, { ignoreEncryption: true });
  const mergeDoc = await PDFDocument.load(mergeBytes, { ignoreEncryption: true });
  const copiedPages = await pdfDoc.copyPages(mergeDoc, mergeDoc.getPageIndices());

  const insertAt = position !== undefined
    ? Math.min(position, pdfDoc.getPageCount())
    : pdfDoc.getPageCount();

  for (let i = 0; i < copiedPages.length; i++) {
    pdfDoc.insertPage(insertAt + i, copiedPages[i]);
  }

  return pdfDoc.save();
}

export async function cropPage(
  state: DocumentState,
  pageIndex: number,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(state.pdfBytes, { ignoreEncryption: true });
  const page = pdfDoc.getPage(pageIndex);
  page.setCropBox(x, y, width, height);
  return pdfDoc.save();
}
