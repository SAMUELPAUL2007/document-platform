import JSZip from 'jszip'
import { parseStringPromise } from 'xml2js'
import type { Presentation, Slide, TextObject, ShapeObject } from './types'
import { createPresentation, createSlideId, createId } from './engine'
import { getTheme } from './themes'

interface PptxSlideXml {
  p: {
    cSld?: { spTree?: { sp?: Record<string, unknown>[] } }
  }
}

interface PptxRelationships {
  Relationship: { $: { Id: string; Type: string; Target: string } }[]
}

function parseColor(color?: string): string {
  if (!color) return '#000000'
  if (color.startsWith('#')) return color
  if (color.length === 6) return `#${color}`
  return '#000000'
}

function extractText(paragraphs: unknown): string {
  if (!paragraphs) return ''
  const arr = Array.isArray(paragraphs) ? paragraphs : [paragraphs]
  return arr.map((p) => {
    const para = p as Record<string, unknown>
    if (para.t) return (para.t as string[]).join('')
    if (para.r) {
      return (para.r as Record<string, unknown>[]).map((r) => (r.t as string[])?.join('') ?? '').join('')
    }
    return ''
  }).join('\n')
}

function extractStyle(paragraph: unknown): { fontSize: number; bold: boolean; italic: boolean; color: string } {
  const defaultStyle = { fontSize: 18, bold: false, italic: false, color: '#000000' }
  const para = paragraph as Record<string, unknown> | undefined
  if (!para?.r) return defaultStyle
  const rArr = para.r as Record<string, unknown>[]
  const firstRun = Array.isArray(rArr) ? rArr[0] : rArr
  if (!firstRun?.rPr) return defaultStyle
  const rPr = firstRun.rPr as Record<string, unknown>
  const attrs = (rPr.$ as Record<string, string>) || {}
  const sz = attrs.sz
  const b = attrs.b
  const i = attrs.i
  const solidFill = rPr.solidFill as Record<string, unknown>[] | undefined
  const colorObj = solidFill?.[0] as Record<string, Record<string, string>> | undefined
  const srgbClr = colorObj?.srgbClr as Record<string, string> | undefined
  const colorVal = srgbClr?.val
  return {
    fontSize: sz ? Math.round(parseInt(sz) / 100) : 18,
    bold: b === '1',
    italic: i === '1',
    color: colorVal ? parseColor(colorVal) : '#000000'
  }
}

function emuToPixels(emu: string | number): number {
  const val = typeof emu === 'string' ? parseInt(emu) : emu
  return Math.round(val / 9525)
}

export async function importPptx(file: File): Promise<Presentation> {
  const buffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(buffer)
  const presentation = createPresentation(file.name.replace(/\.(pptx|ppt)$/i, ''))
  const slideFiles = Object.keys(zip.files).filter(f => f.match(/^ppt\/slides\/slide\d+\.xml$/)).sort()
  const relsFile = zip.files['ppt/_rels/presentation.xml.rels']
  if (relsFile) {
    const relsText = await relsFile.async('text')
    const relsXml = await parseStringPromise(relsText) as PptxRelationships
    if (relsXml.Relationship) {
      const slideRels = Object.fromEntries(
        relsXml.Relationship
          .filter(r => r.$.Type.includes('/slide'))
          .map(r => [r.$.Target.replace('slides/', ''), r.$.Id])
      )
      void slideRels
    }
  }
  const slides: Slide[] = []
  for (const slideFile of slideFiles) {
    const slideXmlFile = zip.files[slideFile]
    if (!slideXmlFile) continue
    const slideXmlText = await slideXmlFile.async('text')
    const slideXml = await parseStringPromise(slideXmlText) as PptxSlideXml
    const slide: Slide = {
      id: createSlideId(),
      order: slides.length,
      layout: 'blank',
      background: '#ffffff',
      objects: [],
      transition: { type: 'none', duration: 500 },
      notes: { text: '' }
    }
    const spTree = slideXml?.p?.cSld?.spTree
    if (spTree?.sp) {
      const shapes = Array.isArray(spTree.sp) ? spTree.sp : [spTree.sp]
      let zIndex = 0
      for (const sp of shapes) {
        const spPr = sp.spPr as Record<string, unknown>[] | undefined
        const xfrm = spPr?.[0]?.xfrm as Record<string, unknown>[] | undefined
        const off = xfrm?.[0]?.off as Record<string, Record<string, string>>[] | undefined
        const ext = xfrm?.[0]?.ext as Record<string, Record<string, string>>[] | undefined
        const offAttrs = off?.[0]?.$
        const extAttrs = ext?.[0]?.$
        if (!offAttrs || !extAttrs) continue
        const x = emuToPixels(offAttrs.x)
        const y = emuToPixels(offAttrs.y)
        const width = emuToPixels(extAttrs.cx)
        const height = emuToPixels(extAttrs.cy)
        if (sp.txBody) {
          const txBody = sp.txBody as Record<string, unknown>[]
          const text = extractText(txBody[0] ? (txBody[0] as Record<string, unknown>).p : undefined)
          const style = extractStyle(txBody[0] ? ((txBody[0] as Record<string, unknown>).p as Record<string, unknown>[] | undefined)?.[0] : undefined)
          const textObj: TextObject = {
            id: createId(),
            type: 'text',
            x, y, width, height,
            rotation: 0,
            zIndex: zIndex++,
            opacity: 1,
            locked: false,
            visible: true,
            text,
            fontSize: style.fontSize,
            fontFamily: 'Arial',
            fontWeight: style.bold ? 'bold' : 'normal',
            fontStyle: style.italic ? 'italic' : 'normal',
            textDecoration: 'none',
            textAlign: 'left',
            color: style.color,
            lineHeight: 1.5,
            data: { editing: false }
          }
          slide.objects.push(textObj)
        } else {
          const shapeObj: ShapeObject = {
            id: createId(),
            type: 'shape',
            x, y, width, height,
            rotation: 0,
            zIndex: zIndex++,
            opacity: 1,
            locked: false,
            visible: true,
            shapeType: 'rect',
            fill: '#3b82f6',
            stroke: 'transparent',
            strokeWidth: 0,
            data: {}
          }
          slide.objects.push(shapeObj)
        }
      }
    }
    slides.push(slide)
  }
  if (slides.length === 0) {
    slides.push({
      id: createSlideId(),
      order: 0,
      layout: 'blank',
      background: '#ffffff',
      objects: [],
      transition: { type: 'none', duration: 500 },
      notes: { text: '' }
    })
  }
  presentation.slides = slides
  presentation.theme = getTheme('default')
  presentation.format = 'pptx'
  return presentation
}
