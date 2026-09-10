import type { Presentation, Slide, TextObject } from './types'
import { rgb } from 'pdf-lib'

const SLIDE_W = 960
const SLIDE_H = 540

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function rgbToHex(color: string): string {
  if (!color || color === 'transparent') return 'FFFFFF'
  if (color.startsWith('#')) return color.slice(1).toUpperCase()
  if (color.startsWith('rgb')) {
    const m = color.match(/\d+/g)
    if (m && m.length >= 3) {
      return [m[0], m[1], m[2]].map(v => (+v).toString(16).padStart(2, '0')).join('').toUpperCase()
    }
  }
  return '000000'
}

function buildTextXml(obj: { text: string; fontSize: number; fontFamily: string; fontWeight: string; fontStyle: string; color: string; x: number; y: number; width: number; height: number; textAlign: string }): string {
  const colorHex = rgbToHex(obj.color)
  const isBold = obj.fontWeight === 'bold' || obj.fontWeight === '700' || obj.fontWeight === '800' || obj.fontWeight === '900'
  const isItalic = obj.fontStyle === 'italic' || obj.fontStyle === 'oblique'
  const szPt = Math.round(obj.fontSize * 72 / 96)
  const algn = obj.textAlign === 'center' ? 'ctr' : obj.textAlign === 'right' ? 'r' : 'l'
  const tx = Math.round((obj.x / SLIDE_W) * 10000000)
  const ty = Math.round((obj.y / SLIDE_H) * 10000000)
  const cx = Math.round(((SLIDE_W - obj.x - obj.width) / SLIDE_W) * 10000000)
  const cy = Math.round(((SLIDE_H - obj.y - obj.height) / SLIDE_H) * 10000000)
  const paragraphs = obj.text.split('\n').filter(p => p !== '')
  const runs = paragraphs.map(p =>
    `<a:r><a:rPr lang="en-US" altLang="en-US" sz="${szPt * 100}" b="${isBold ? 1 : 0}" i="${isItalic ? 1 : 0}" dirty="0"><a:solidFill><a:srgbClr val="${colorHex}"/></a:solidFill><a:latin typeface="${escapeXml(obj.fontFamily)}" panose="020B0604020202020204" pitchFamily="34" charset="0"/><a:ea typeface="" panose="020B0604020202020204" pitchFamily="34" charset="0"/></a:rPr><a:t>${escapeXml(p)}</a:t></a:r>`
  )
  const runBlocks = runs.map(r => `<a:p><a:pPr algn="${algn}"/>${r}</a:p>`).join('')
  return `<p:sp><p:nvSpPr><p:cNvPr id="0" name=""/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${tx}" y="${ty}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="t" anchorCtr="0"/><a:lstStyle/>${runBlocks}</p:txBody></p:sp>`
}

function buildShapeXml(obj: { shapeType: string; fill: string; stroke: string; strokeWidth: number; x: number; y: number; width: number; height: number }): string {
  const fillHex = rgbToHex(obj.fill)
  const strokeHex = rgbToHex(obj.stroke)
  const tx = Math.round((obj.x / SLIDE_W) * 10000000)
  const ty = Math.round((obj.y / SLIDE_H) * 10000000)
  const cx = Math.round(((SLIDE_W - obj.x - obj.width) / SLIDE_W) * 10000000)
  const cy = Math.round(((SLIDE_H - obj.y - obj.height) / SLIDE_H) * 10000000)
  const prst = obj.shapeType === 'rect' ? 'rect' :
    obj.shapeType === 'ellipse' ? 'ellipse' :
    obj.shapeType === 'triangle' ? 'triangle' :
    obj.shapeType === 'line' ? 'line' :
    obj.shapeType === 'arrow' ? 'rightArrow' : 'rect'
  const solidFill = obj.fill === 'transparent' ? '<a:noFill/>' : `<a:solidFill><a:srgbClr val="${fillHex}"/></a:solidFill>`
  const ln = obj.strokeWidth > 0 ? `<a:ln w="${obj.strokeWidth * 12700}"><a:solidFill><a:srgbClr val="${strokeHex}"/></a:solidFill></a:ln>` : '<a:ln><a:noFill/></a:ln>'
  return `<p:sp><p:nvSpPr><p:cNvPr id="0" name=""/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${tx}" y="${ty}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="${prst}"><a:avLst/></a:prstGeom>${solidFill}${ln}</p:spPr></p:sp>`
}

function buildTableXml(obj: { data: { rows: number; cols: number; cells: { text: string; fill: string; stroke: string }[][] }; x: number; y: number; width: number; height: number }): string {
  const tx = Math.round((obj.x / SLIDE_W) * 10000000)
  const ty = Math.round((obj.y / SLIDE_H) * 10000000)
  const cx = Math.round(((SLIDE_W - obj.x - obj.width) / SLIDE_W) * 10000000)
  const cy = Math.round(((SLIDE_H - obj.y - obj.height) / SLIDE_H) * 10000000)
  const colW = Math.round(obj.width / obj.data.cols)
  const rowH = Math.round(obj.height / obj.data.rows)
  const tbl = `<a:tbl><a:tblPr firstRow="1" bandRow="1"><a:tblStyle prst=""/><a:tblW w="0" type="auto"/></a:tblPr><a:tblGrid>${Array.from({ length: obj.data.cols }, () => `<a:gridCol w="${colW * 914400 / SLIDE_W}"/>`).join('')}</a:tblGrid>${obj.data.cells.map((row) =>
    `<a:tr h="${rowH * 914400 / SLIDE_H}">${row.map((cell) => {
      const fillHex = rgbToHex(cell.fill || '#ffffff')
      const strokeHex = rgbToHex(cell.stroke || '#e2e8f0')
      return `<a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="1400" b="0" i="0" dirty="0"><a:solidFill><a:srgbClr val="1e293b"/></a:solidFill><a:latin typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/></a:rPr><a:t>${escapeXml(cell.text || '')}</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="${fillHex}"/></a:solidFill><a:lnL w="6350"><a:solidFill><a:srgbClr val="${strokeHex}"/></a:solidFill></a:lnL><a:lnR w="6350"><a:solidFill><a:srgbClr val="${strokeHex}"/></a:solidFill></a:lnR><a:lnT w="6350"><a:solidFill><a:srgbClr val="${strokeHex}"/></a:solidFill></a:lnT><a:lnB w="6350"><a:solidFill><a:srgbClr val="${strokeHex}"/></a:solidFill></a:lnB></a:tcPr></a:tc>`
    }).join('')}</a:tr>`
  ).join('')}</a:tbl>`
  return `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="0" name="Table"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${tx}" y="${ty}"/><a:ext cx="${cx}" cy="${cy}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">${tbl}</a:graphicData></a:graphic></p:graphicFrame>`
}

function buildSlideContent(slide: Slide): string {
  const bgHex = rgbToHex(slide.background)
  const objects = [...slide.objects].sort((a, b) => a.zIndex - b.zIndex).filter(o => o.visible)
  const shapeXml = objects.map(obj => {
    if (obj.type === 'text') return buildTextXml(obj as never)
    if (obj.type === 'shape') return buildShapeXml(obj as never)
    if (obj.type === 'table') return buildTableXml(obj as never)
    return ''
  }).join('\n        ')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg>
      <p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef>
      <p:bgPr><a:solidFill><a:srgbClr val="${bgHex}"/></a:solidFill><a:effectLst/></p:bgPr>
    </p:bg>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
        ${shapeXml}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterMapping mapping master="master1" clrMap="tx1"/></p:clrMapOvr>
</p:sld>`
}

function buildContentTypesXml(presentation: Presentation): string {
  const slideCount = presentation.slides.length
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  ${Array.from({ length: slideCount }, (_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('\n  ')}
</Types>`
}

function buildCoreXml(presentation: Presentation): string {
  const title = presentation.title || ''
  const author = presentation.metadata?.author || ''
  const subject = presentation.metadata?.subject || ''
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(title)}</dc:title>
  <dc:subject>${escapeXml(subject)}</dc:subject>
  <dc:creator>${escapeXml(author)}</dc:creator>
</cp:coreProperties>`
}

function buildAppXml(presentation: Presentation): string {
  const slideCount = presentation.slides.length
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>DocFlow</Application>
  <Slides>${slideCount}</Slides>
</Properties>`
}

function buildPresentationRelationshipsXml(presentation: Presentation): string {
  const slideXml = Array.from({ length: presentation.slides.length }, (_, i) =>
    `    <Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`
  ).join('\n')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${slideXml}
</Relationships>`
}

function buildPresentationXml(presentation: Presentation): string {
  const slideCount = presentation.slides.length
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
${Array.from({ length: slideCount }, (_, i) => `    <p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`).join('\n')}
  </p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000" type="screen4x3"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`
}

function buildSlideFile(slide: Slide): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
${buildSlideContent(slide)}`
}

function zipStrings(files: Record<string, string>): Blob {
  const entries: { name: string; data: string }[] = []
  for (const [name, content] of Object.entries(files)) {
    entries.push({ name, data: content })
  }
  const encoder = new TextEncoder()
  const localHeaders: Uint8Array[] = []
  const centralHeaders: Uint8Array[] = []
  const dataBlobs: Uint8Array[] = []
  let offset = 0
  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name)
    const dataBytes = encoder.encode(entry.data)
    const crc = crc32(dataBytes)
    const localHeader = new Uint8Array(30 + nameBytes.length)
    const dv = new DataView(localHeader.buffer)
    dv.setUint32(0, 0x04034b50, true)
    dv.setUint16(4, 20, true)
    dv.setUint16(6, 0, true)
    dv.setUint16(8, 0, true)
    dv.setUint16(10, 0, true)
    dv.setUint16(12, 0, true)
    dv.setUint32(14, crc, true)
    dv.setUint32(18, dataBytes.length, true)
    dv.setUint32(22, dataBytes.length, true)
    dv.setUint16(26, nameBytes.length, true)
    dv.setUint16(28, 0, true)
    localHeader.set(nameBytes, 30)
    const centralHeader = new Uint8Array(46 + nameBytes.length)
    const cdv = new DataView(centralHeader.buffer)
    cdv.setUint32(0, 0x02014b50, true)
    cdv.setUint16(4, 20, true)
    cdv.setUint16(6, 20, true)
    cdv.setUint16(8, 0, true)
    cdv.setUint16(10, 0, true)
    cdv.setUint16(12, 0, true)
    cdv.setUint16(14, 0, true)
    cdv.setUint32(16, crc, true)
    cdv.setUint32(20, dataBytes.length, true)
    cdv.setUint32(24, dataBytes.length, true)
    cdv.setUint16(28, nameBytes.length, true)
    cdv.setUint16(30, 0, true)
    cdv.setUint16(32, 0, true)
    cdv.setUint16(34, 0, true)
    cdv.setUint16(36, 0, true)
    cdv.setUint32(38, 0x20, true)
    cdv.setUint32(42, offset, true)
    centralHeader.set(nameBytes, 46)
    localHeaders.push(localHeader)
    dataBlobs.push(dataBytes)
    centralHeaders.push(centralHeader)
    offset += localHeader.length + dataBytes.length
  }
  const centralDirOffset = offset
  let centralDirSize = 0
  for (const ch of centralHeaders) { centralDirSize += ch.length }
  const eocd = new Uint8Array(22)
  const eocdDv = new DataView(eocd.buffer)
  eocdDv.setUint32(0, 0x06054b50, true)
  eocdDv.setUint16(4, 0, true)
  eocdDv.setUint16(6, 0, true)
  eocdDv.setUint16(8, entries.length, true)
  eocdDv.setUint16(10, entries.length, true)
  eocdDv.setUint32(12, centralDirSize, true)
  eocdDv.setUint32(16, centralDirOffset, true)
  eocdDv.setUint16(20, 0, true)
  const parts: Uint8Array[] = []
  for (let i = 0; i < entries.length; i++) {
    parts.push(localHeaders[i])
    parts.push(dataBlobs[i])
  }
  for (const ch of centralHeaders) parts.push(ch)
  parts.push(eocd)
  let totalLen = 0
  for (const p of parts) totalLen += p.length
  const result = new Uint8Array(totalLen)
  let pos = 0
  for (const p of parts) { result.set(p, pos); pos += p.length }
  return new Blob([result], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
}

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

export function exportToPptx(presentation: Presentation): Blob {
  const files: Record<string, string> = {}
  files['[Content_Types].xml'] = buildContentTypesXml(presentation)
  files['_rels/.rels'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`
  files['ppt/presentation.xml'] = buildPresentationXml(presentation)
  files['docProps/core.xml'] = buildCoreXml(presentation)
  files['docProps/app.xml'] = buildAppXml(presentation)
  for (let i = 0; i < presentation.slides.length; i++) {
    files[`ppt/slides/slide${i + 1}.xml`] = buildSlideFile(presentation.slides[i])
  }
  files['ppt/_rels/presentation.xml.rels'] = buildPresentationRelationshipsXml(presentation)
  return zipStrings(files)
}

export async function downloadPresentation(presentation: Presentation, format: 'pptx' | 'pdf' = 'pptx'): Promise<void> {
  if (format === 'pptx') {
    const blob = exportToPptx(presentation)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${presentation.title || 'presentation'}.pptx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } else if (format === 'pdf') {
    const { PDFDocument } = await import('pdf-lib')
    const pdfDoc = await PDFDocument.create()
    for (const slide of presentation.slides) {
      const page = pdfDoc.addPage([612, 792])
      const bgHex = rgbToHex(slide.background)
      const r = parseInt(bgHex.slice(0, 2), 16) / 255
      const g = parseInt(bgHex.slice(2, 4), 16) / 255
      const b = parseInt(bgHex.slice(4, 6), 16) / 255
      page.drawRectangle({ x: 0, y: 0, width: 612, height: 792, color: rgb(r, g, b) })
      const objects = [...slide.objects].sort((a, b) => a.zIndex - b.zIndex).filter(o => o.visible)
      for (const obj of objects) {
        if (obj.type === 'text') {
          const textObj = obj as TextObject
          const fontSize = Math.round(textObj.fontSize * 72 / 96)
          const x = (textObj.x / SLIDE_W) * 612
          const y = 792 - (textObj.y / SLIDE_H) * 792 - fontSize
          page.drawText(textObj.text.slice(0, 100), {
            x,
            y,
            size: fontSize,
            color: rgb(0.1, 0.1, 0.1)
          })
        }
      }
    }
    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${presentation.title || 'presentation'}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}
