export type EditorTool =
  | "select"
  | "text"
  | "drawing"
  | "highlight"
  | "underline"
  | "strikethrough"
  | "rectangle"
  | "ellipse"
  | "line"
  | "arrow"
  | "image"
  | "signature"
  | "watermark-text"
  | "watermark-image"
  | "page-number";

export type ObjectType =
  | "text"
  | "drawing"
  | "highlight"
  | "underline"
  | "strikethrough"
  | "rectangle"
  | "ellipse"
  | "line"
  | "arrow"
  | "image"
  | "signature"
  | "watermark"
  | "page-number";

export type TextAlign = "left" | "center" | "right";

export interface Point {
  x: number;
  y: number;
}

export interface BaseObject {
  id: string;
  type: ObjectType;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  zIndex: number;
  opacity: number;
}

export interface TextObject extends BaseObject {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  color: string;
  textAlign: TextAlign;
  lineHeight: number;
}

export interface DrawingObject extends BaseObject {
  type: "drawing";
  points: Point[];
  strokeColor: string;
  strokeWidth: number;
}

export interface HighlightObject extends BaseObject {
  type: "highlight" | "underline" | "strikethrough";
  color: string;
  opacity: number;
}

export interface ShapeObject extends BaseObject {
  type: "rectangle" | "ellipse" | "line";
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
}

export interface ArrowObject extends BaseObject {
  type: "arrow";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  strokeColor: string;
  strokeWidth: number;
}

export interface ImageObject extends BaseObject {
  type: "image";
  imageBytes: Uint8Array;
  mimeType: string;
}

export interface SignatureObject extends BaseObject {
  type: "signature";
  signatureBytes: Uint8Array;
}

export interface WatermarkObject extends BaseObject {
  type: "watermark";
  variant: "text" | "image";
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  imageBytes?: Uint8Array;
  opacity: number;
  rotation: number;
}

export interface PageNumberObject extends BaseObject {
  type: "page-number";
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  format: "page" | "page-total" | "page-of-total";
}

export type EditorObject =
  | TextObject
  | DrawingObject
  | HighlightObject
  | ShapeObject
  | ArrowObject
  | ImageObject
  | SignatureObject
  | WatermarkObject
  | PageNumberObject;

export interface EditorState {
  objects: EditorObject[];
  selectedIds: string[];
  clipboard: EditorObject[];
  activePageIndex: number;
  zoom: number;
}

export interface EditorHistory {
  past: EditorObject[][];
  future: EditorObject[][];
}

export interface ResizeHandle {
  position: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "rotate";
  x: number;
  y: number;
}
