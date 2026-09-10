export interface Point { x: number; y: number }

export interface SlideObject {
  id: string
  type: 'text' | 'shape' | 'image' | 'table'
  x: number
  y: number
  width: number
  height: number
  rotation: number
  zIndex: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  opacity: number
  locked: boolean
  visible: boolean
  data?: Record<string, unknown>
}

export interface TextObject extends SlideObject {
  type: 'text'
  text: string
  fontSize: number
  fontFamily: string
  fontWeight: string
  fontStyle: string
  textDecoration: string
  textAlign: 'left' | 'center' | 'right'
  color: string
  lineHeight: number
  data: { editing: boolean }
}

export interface ShapeObject extends SlideObject {
  type: 'shape'
  shapeType: 'rect' | 'ellipse' | 'triangle' | 'line' | 'arrow' | 'star'
  fill: string
  stroke: string
  strokeWidth: number
  data: Record<string, unknown>
}

export interface ImageObject extends SlideObject {
  type: 'image'
  src: string
  data: { originalWidth: number; originalHeight: number; objectUrl?: string }
}

export interface TableCell {
  text: string
  fontSize: number
  fontFamily: string
  fontWeight: string
  fontStyle: string
  textAlign: 'left' | 'center' | 'right'
  color: string
  fill: string
  stroke: string
}

export interface TableObject extends SlideObject {
  type: 'table'
  data: {
    rows: number
    cols: number
    cells: TableCell[][]
    rowHeights: number[]
    colWidths: number[]
  }
}

export interface SlideTransition {
  type: 'none' | 'fade' | 'slide' | 'zoom'
  duration: number
}

export interface SlideNotes { text: string }

export interface Slide {
  id: string
  order: number
  layout: SlideLayoutType
  background: string
  objects: SlideObject[]
  transition: SlideTransition
  notes: SlideNotes
  templateId?: string
}

export type SlideLayoutType = 'blank' | 'title' | 'titleContent' | 'twoColumn' | 'sectionHeader'

export type LayoutObject = Partial<SlideObject> & { type: SlideObject['type'] } & Record<string, unknown>

export interface SlideLayout {
  type: SlideLayoutType
  name: string
  description: string
  objects: LayoutObject[]
}

export interface Theme {
  id: string
  name: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
    textLight: string
    border: string
  }
  fonts: {
    heading: string
    body: string
    mono: string
  }
  author?: string
  isCustom?: boolean
}

export interface Presentation {
  id: string
  title: string
  description: string
  slides: Slide[]
  theme: Theme
  createdAt: string
  updatedAt: string
  version: number
  fileSize: number
  format: 'pptx' | 'ppt' | 'pdf' | 'unknown'
  metadata?: { author?: string; subject?: string; keywords?: string[] }
}

export type ObjectType = 'text' | 'shape' | 'image' | 'table'

export interface EditorState {
  presentation: Presentation | null
  currentSlideId: string | null
  selectedObjectIds: string[]
  zoom: number
  tool: 'select' | 'text' | 'shape' | 'image' | 'table' | 'draw'
  isDragging: boolean
  isResizing: boolean
  isRotating: boolean
  clipboard: SlideObject[]
  history: Presentation[]
  historyIndex: number
  gridEnabled: boolean
  guidesEnabled: boolean
  notesVisible: boolean
  presentationMode: boolean
  isModified: boolean
}

export interface EditorAction {
  type:
    | 'SET_PRESENTATION'
    | 'ADD_SLIDE'
    | 'REMOVE_SLIDE'
    | 'DUPLICATE_SLIDE'
    | 'REORDER_SLIDES'
    | 'UPDATE_SLIDE'
    | 'SELECT_SLIDE'
    | 'ADD_OBJECT'
    | 'UPDATE_OBJECT'
    | 'REMOVE_OBJECT'
    | 'SELECT_OBJECTS'
    | 'CLEAR_SELECTION'
    | 'SET_TOOL'
    | 'SET_ZOOM'
    | 'UNDO'
    | 'REDO'
    | 'COPY'
    | 'CUT'
    | 'PASTE'
    | 'DUPLICATE_OBJECT'
    | 'SET_THEME'
    | 'UPDATE_THEME'
    | 'TOGGLE_GRID'
    | 'TOGGLE_GUIDES'
    | 'TOGGLE_NOTES'
    | 'SET_PRESENTATION_MODE'
    | 'SET_MODIFIED'
    | 'GROUP_OBJECTS'
    | 'UNGROUP_OBJECTS'
    | 'BRING_FORWARD'
    | 'SEND_BACKWARD'
    | 'ALIGN_OBJECTS'
  payload?: unknown
}

export type ExportFormat = 'pptx' | 'pdf' | 'ppt' | 'png' | 'jpg' | 'svg'
