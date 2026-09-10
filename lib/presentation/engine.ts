import type {
  Slide,
  SlideObject,
  TextObject,
  Theme,
  Presentation
} from './types'

export function createId(): string {
  return `obj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createSlideId(): string {
  return `slide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function getSlideBounds(objects: SlideObject[]) {
  if (objects.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const obj of objects) {
    if (obj.x < minX) minX = obj.x
    if (obj.y < minY) minY = obj.y
    if (obj.x + obj.width > maxX) maxX = obj.x + obj.width
    if (obj.y + obj.height > maxY) maxY = obj.y + obj.height
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function isPointInObject(px: number, py: number, obj: SlideObject): boolean {
  const rad = (obj.rotation * Math.PI) / 180
  const cos = Math.cos(-rad)
  const sin = Math.sin(-rad)
  const cx = obj.x + obj.width / 2
  const cy = obj.y + obj.height / 2
  const dx = px - cx
  const dy = py - cy
  const lx = dx * cos - dy * sin + obj.width / 2
  const ly = dx * sin + dy * cos + obj.height / 2
  return lx >= 0 && lx <= obj.width && ly >= 0 && ly <= obj.height
}

export function getObjectsInRect(
  objects: SlideObject[],
  x: number, y: number, w: number, h: number
): SlideObject[] {
  return objects.filter(obj => {
    if (!obj.visible) return false
    const ox = Math.min(obj.x, obj.x + obj.width)
    const oy = Math.min(obj.y, obj.y + obj.height)
    const ow = Math.abs(obj.width)
    const oh = Math.abs(obj.height)
    return ox < x + w && ox + ow > x && oy < y + h && oy + oh > y
  })
}

export function constrainToSlide(
  obj: SlideObject,
  slideWidth: number,
  slideHeight: number
): SlideObject {
  const x = Math.max(0, Math.min(obj.x, slideWidth - obj.width))
  const y = Math.max(0, Math.min(obj.y, slideHeight - obj.height))
  return { ...obj, x, y }
}

export function snapToGrid(
  value: number,
  gridSize: number,
  enabled: boolean
): number {
  if (!enabled || gridSize <= 0) return value
  return Math.round(value / gridSize) * gridSize
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export function applyThemeToSlide(slide: Slide, theme: Theme): Slide {
  return {
    ...slide,
    objects: slide.objects.map(obj => {
      if (obj.type === 'text') {
        const textObj = obj as TextObject
        if (textObj.fontSize === 36 || textObj.fontSize === 40) {
          return { ...textObj, fontFamily: theme.fonts.heading }
        }
        return { ...textObj, fontFamily: theme.fonts.body }
      }
      return obj
    })
  }
}

export function createPresentation(title: string, theme?: Theme): Presentation {
  return {
    id: `pres-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    description: '',
    slides: [],
    theme: theme ?? {
      id: 'default',
      name: 'Default',
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        accent: '#06b6d4',
        background: '#ffffff',
        text: '#1e293b',
        textLight: '#64748b',
        border: '#e2e8f0'
      },
      fonts: { heading: 'Arial', body: 'Arial', mono: 'Courier New' }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    fileSize: 0,
    format: 'unknown',
    metadata: {}
  }
}

export function getSlideThumbnail(presentation: Presentation, slideId: string): string | null {
  const slide = presentation.slides.find(s => s.id === slideId)
  if (!slide) return null
  const sorted = [...slide.objects].sort((a, b) => a.zIndex - b.zIndex)
  const visible = sorted.filter(o => o.visible)
  if (visible.length === 0) return null
  const bounds = getSlideBounds(visible)
  return `thumb-${bounds.x}-${bounds.y}-${bounds.width}-${bounds.height}`
}

export function validatePresentation(presentation: Presentation): string[] {
  const errors: string[] = []
  if (!presentation.title) errors.push('Presentation title is required')
  if (presentation.slides.length === 0) errors.push('Presentation must have at least one slide')
  for (const slide of presentation.slides) {
    if (!slide.id) errors.push('Slide ID is missing')
    for (const obj of slide.objects) {
      if (!obj.id) errors.push(`Object in slide ${slide.id} is missing ID`)
      if (obj.width <= 0 || obj.height <= 0) {
        errors.push(`Object ${obj.id} has invalid dimensions`)
      }
    }
  }
  return errors
}
