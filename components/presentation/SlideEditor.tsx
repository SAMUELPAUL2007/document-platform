'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Presentation, Slide, SlideObject, TextObject, ShapeObject, ImageObject, TableObject, SlideLayoutType } from '@/lib/presentation/types'
import { createPresentation, deepClone, createSlideId, createId } from '@/lib/presentation/engine'
import { createDefaultSlide, SLIDE_LAYOUTS } from '@/lib/presentation/layouts'
import { DEFAULT_THEMES } from '@/lib/presentation/themes'
import { downloadPresentation } from '@/lib/presentation/export'
import { importPptx } from '@/lib/presentation/import'

const SLIDE_W = 960
const SLIDE_H = 540

type Tool = 'select' | 'text' | 'shape' | 'image' | 'table' | 'draw'

interface Props {
  initialPresentation?: Presentation
}

export default function SlideEditor({ initialPresentation }: Props) {
  const [presentation, setPresentation] = useState<Presentation>(() =>
    initialPresentation ?? createPresentation('Untitled Presentation')
  )
  const [currentSlideId, setCurrentSlideId] = useState<string | null>(
    presentation.slides[0]?.id ?? null
  )
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [tool, setTool] = useState<Tool>('select')
  const [zoom, setZoom] = useState(1)
  const [gridEnabled, setGridEnabled] = useState(false)
  const [notesVisible, setNotesVisible] = useState(false)
  const [presMode, setPresMode] = useState(false)
  const [presModeSlideIdx, setPresModeSlideIdx] = useState(0)
  const [showLayoutMenu, setShowLayoutMenu] = useState(false)
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const [editingText, setEditingText] = useState<string | null>(null)
  const [showFileMenu, setShowFileMenu] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const currentSlide = presentation.slides.find(s => s.id === currentSlideId) ?? null

  const commit = useCallback((fn: (p: Presentation) => Presentation) => {
    setPresentation(p => fn(p))
  }, [])

  const addSlide = useCallback((layoutType: SlideLayoutType = 'blank') => {
    const slide = createDefaultSlide(layoutType)
    slide.order = presentation.slides.length
    commit(p => ({ ...p, slides: [...p.slides, slide] }))
    setCurrentSlideId(slide.id)
    setSelectedIds([])
    setShowLayoutMenu(false)
  }, [presentation.slides.length, commit])

  const removeSlide = useCallback((slideId: string) => {
    if (presentation.slides.length <= 1) return
    commit(p => {
      const slides = p.slides.filter(s => s.id !== slideId).map((s, i) => ({ ...s, order: i }))
      return { ...p, slides }
    })
    if (currentSlideId === slideId) {
      setCurrentSlideId(presentation.slides.find(s => s.id !== slideId)?.id ?? null)
    }
    setSelectedIds([])
  }, [presentation.slides, currentSlideId, commit])

  const duplicateSlide = useCallback((slideId: string) => {
    const src = presentation.slides.find(s => s.id === slideId)
    if (!src) return
    const dup: Slide = {
      ...deepClone(src),
      id: createSlideId(),
      order: presentation.slides.length,
      objects: src.objects.map(o => ({ ...deepClone(o), id: createId() }))
    }
    commit(p => {
      const slides = [...p.slides, dup].map((s, i) => ({ ...s, order: i }))
      return { ...p, slides }
    })
    setCurrentSlideId(dup.id)
    setSelectedIds([])
  }, [presentation.slides, commit])

  const addObject = useCallback((obj: SlideObject) => {
    if (!currentSlideId) return
    commit(p => ({
      ...p,
      slides: p.slides.map(s =>
        s.id === currentSlideId ? { ...s, objects: [...s.objects, obj] } : s
      )
    }))
    setSelectedIds([obj.id])
  }, [currentSlideId, commit])

  const updateObject = useCallback((objectId: string, updates: Partial<SlideObject>) => {
    if (!currentSlideId) return
    commit(p => ({
      ...p,
      slides: p.slides.map(s =>
        s.id === currentSlideId
          ? { ...s, objects: s.objects.map(o => o.id === objectId ? { ...o, ...updates } : o) }
          : s
      )
    }))
  }, [currentSlideId, commit])

  const removeObject = useCallback((ids: string[]) => {
    if (!currentSlideId) return
    commit(p => ({
      ...p,
      slides: p.slides.map(s =>
        s.id === currentSlideId ? { ...s, objects: s.objects.filter(o => !ids.includes(o.id)) } : s
      )
    }))
    setSelectedIds([])
  }, [currentSlideId, commit])

  const addTextObject = useCallback(() => {
    const obj: TextObject = {
      id: createId(),
      type: 'text',
      x: 200, y: 200, width: 400, height: 60,
      rotation: 0,
      zIndex: currentSlide?.objects.length ?? 0,
      opacity: 1,
      locked: false,
      visible: true,
      text: 'Click to edit text',
      fontSize: 24,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'left',
      color: '#1e293b',
      lineHeight: 1.5,
      data: { editing: false }
    }
    addObject(obj)
    setTool('select')
  }, [currentSlide, addObject])

  const addShapeObject = useCallback((shapeType: ShapeObject['shapeType'] = 'rect') => {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
    const obj: ShapeObject = {
      id: createId(),
      type: 'shape',
      x: 200, y: 150, width: 200, height: 150,
      rotation: 0,
      zIndex: currentSlide?.objects.length ?? 0,
      opacity: 1,
      locked: false,
      visible: true,
      shapeType,
      fill: colors[Math.floor(Math.random() * colors.length)],
      stroke: 'transparent',
      strokeWidth: 0,
      data: {}
    }
    addObject(obj)
    setTool('select')
  }, [currentSlide, addObject])

  const addImageObject = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const url = URL.createObjectURL(file)
      const img = new window.Image()
      img.onload = () => {
        const maxW = 600
        const maxH = 400
        const scale = Math.min(maxW / img.width, maxH / img.height, 1)
        const obj: ImageObject = {
          id: createId(),
          type: 'image',
          x: 180, y: 70,
          width: Math.round(img.width * scale),
          height: Math.round(img.height * scale),
          rotation: 0,
          zIndex: currentSlide?.objects.length ?? 0,
          opacity: 1,
          locked: false,
          visible: true,
          src: url,
          data: { originalWidth: img.width, originalHeight: img.height, objectUrl: url }
        }
        addObject(obj)
        setTool('select')
      }
      img.src = url
    }
    input.click()
  }, [currentSlide, addObject])

  const addTableObject = useCallback(() => {
    const rows = 3
    const cols = 3
    const cells = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({
        text: '',
        fontSize: 14,
        fontFamily: 'Arial',
        fontWeight: 'normal' as const,
        fontStyle: 'normal' as const,
        textAlign: 'left' as const,
        color: '#1e293b',
        fill: '#ffffff',
        stroke: '#e2e8f0'
      }))
    )
    const obj: TableObject = {
      id: createId(),
      type: 'table',
      x: 100, y: 100, width: 760, height: 300,
      rotation: 0,
      zIndex: currentSlide?.objects.length ?? 0,
      opacity: 1,
      locked: false,
      visible: true,
      data: { rows, cols, cells, rowHeights: Array(rows).fill(300 / rows), colWidths: Array(cols).fill(760 / cols) }
    }
    addObject(obj)
    setTool('select')
  }, [currentSlide, addObject])

  const handleImport = useCallback(async (file: File) => {
    try {
      const pres = await importPptx(file)
      setPresentation(pres)
      setCurrentSlideId(pres.slides[0]?.id ?? null)
      setSelectedIds([])
    } catch (err) {
      console.error('Import failed:', err)
    }
  }, [])

  const handleExportPptx = useCallback(() => {
    downloadPresentation(presentation, 'pptx')
  }, [presentation])

  const handleExportPdf = useCallback(() => {
    downloadPresentation(presentation, 'pdf')
  }, [presentation])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault() }
      if (ctrl && e.key === 'z' && e.shiftKey) { e.preventDefault() }
      if (ctrl && e.key === 'y') { e.preventDefault() }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) { e.preventDefault(); removeObject(selectedIds) }
      }
      if (e.key === 'Escape') {
        if (presMode) setPresMode(false)
        else setSelectedIds([])
      }
      if (ctrl && e.key === 'd') {
        e.preventDefault()
        if (selectedIds.length > 0 && currentSlide) {
          const sel = currentSlide.objects.filter(o => selectedIds.includes(o.id))
          const dupes = sel.map(o => ({ ...deepClone(o), id: createId(), x: o.x + 20, y: o.y + 20 }))
          commit(p => ({
            ...p,
            slides: p.slides.map(s =>
              s.id === currentSlideId ? { ...s, objects: [...s.objects, ...dupes] } : s
            )
          }))
          setSelectedIds(dupes.map(o => o.id))
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedIds, removeObject, presMode, currentSlide, currentSlideId, commit])

  const handlePresentationModeNav = useCallback((dir: 'prev' | 'next') => {
    setPresModeSlideIdx(idx => {
      if (dir === 'next') return Math.min(idx + 1, presentation.slides.length - 1)
      return Math.max(idx - 1, 0)
    })
  }, [presentation.slides.length])

  useEffect(() => {
    if (!presMode) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        handlePresentationModeNav('next')
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        handlePresentationModeNav('prev')
      }
      if (e.key === 'Escape') setPresMode(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [presMode, handlePresentationModeNav])

  if (presMode) {
    const slide = presentation.slides[presModeSlideIdx]
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="relative w-full h-full flex items-center justify-center">
          <div
            className="relative bg-white shadow-2xl"
            style={{ width: '100vw', height: '56.25vw', maxHeight: '100vh', maxWidth: '177.78vh' }}
          >
            {slide && <SlideCanvas slide={slide} zoom={1} isPresentMode />}
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 text-white px-6 py-3 rounded-full text-sm">
            <button onClick={() => handlePresentationModeNav('prev')} disabled={presModeSlideIdx === 0} className="disabled:opacity-40 hover:text-blue-400">◀</button>
            <span>{presModeSlideIdx + 1} / {presentation.slides.length}</span>
            <button onClick={() => handlePresentationModeNav('next')} disabled={presModeSlideIdx === presentation.slides.length - 1} className="disabled:opacity-40 hover:text-blue-400">▶</button>
            <button onClick={() => setPresMode(false)} className="ml-2 hover:text-red-400">✕</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      <input ref={fileInputRef} type="file" accept=".pptx,.ppt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f) }} />

      {/* Top toolbar */}
      <div className="bg-white border-b border-gray-200 px-3 py-1.5 flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1">
          <div className="relative">
            <button onClick={() => setShowFileMenu(!showFileMenu)} className="px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded">File</button>
            {showFileMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 w-44">
                <button onClick={() => { fileInputRef.current?.click(); setShowFileMenu(false) }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Import PPTX</button>
                <button onClick={() => { handleExportPptx(); setShowFileMenu(false) }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Export as PPTX</button>
                <button onClick={() => { handleExportPdf(); setShowFileMenu(false) }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Export as PDF</button>
              </div>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setShowLayoutMenu(!showLayoutMenu)} className="px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded">Insert Slide</button>
            {showLayoutMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 w-52">
                {SLIDE_LAYOUTS.map(l => (
                  <button key={l.type} onClick={() => addSlide(l.type)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                    <span className="font-medium">{l.name}</span>
                    <span className="text-gray-400 text-xs ml-1">— {l.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setShowThemeMenu(!showThemeMenu)} className="px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded">Theme</button>
            {showThemeMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 w-56 p-2">
                {DEFAULT_THEMES.map(t => (
                  <button key={t.id} onClick={() => { commit(p => ({ ...p, theme: t })); setShowThemeMenu(false) }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border" style={{ background: t.colors.primary }} />
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="h-5 w-px bg-gray-200" />
        <div className="flex items-center gap-1">
          <ToolBtn icon="↖" label="Select" active={tool === 'select'} onClick={() => setTool('select')} />
          <ToolBtn icon="T" label="Text" active={tool === 'text'} onClick={() => { setTool('text'); addTextObject() }} />
          <ToolBtn icon="□" label="Shape" active={tool === 'shape'} onClick={() => { setTool('shape'); addShapeObject('rect') }} />
          <ToolBtn icon="◯" label="Ellipse" active={false} onClick={() => addShapeObject('ellipse')} />
          <ToolBtn icon="△" label="Triangle" active={false} onClick={() => addShapeObject('triangle')} />
          <ToolBtn icon="🖼" label="Image" active={false} onClick={addImageObject} />
          <ToolBtn icon="▦" label="Table" active={false} onClick={addTableObject} />
        </div>
        <div className="h-5 w-px bg-gray-200" />
        <div className="flex items-center gap-1">
          <button onClick={() => setGridEnabled(!gridEnabled)} className={`px-2 py-1 text-xs rounded ${gridEnabled ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>Grid</button>
          <button onClick={() => setNotesVisible(!notesVisible)} className={`px-2 py-1 text-xs rounded ${notesVisible ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>Notes</button>
        </div>
        <div className="h-5 w-px bg-gray-200" />
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.25, z - 0.1))} className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">−</button>
          <span className="text-xs text-gray-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">+</button>
        </div>
        <div className="flex-1" />
        <button onClick={() => setPresMode(true)} disabled={presentation.slides.length === 0} className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Present</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Slide thumbnails */}
        <div className="w-56 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0 overflow-hidden">
          <div className="p-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Slides ({presentation.slides.length})</span>
            <button onClick={() => addSlide('blank')} className="text-blue-600 hover:text-blue-800 text-lg leading-none">+</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {presentation.slides.map((slide, idx) => (
              <div
                key={slide.id}
                onClick={() => { setCurrentSlideId(slide.id); setSelectedIds([]) }}
                className={`relative cursor-pointer rounded border-2 transition-all ${currentSlideId === slide.id ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="aspect-video bg-white relative overflow-hidden">
                  <div className="absolute inset-0 origin-top-left" style={{ transform: `scale(${176 / SLIDE_W})` }}>
                    <SlideCanvas slide={slide} zoom={1} isThumbnail />
                  </div>
                </div>
                <div className="absolute top-1 left-1 bg-black/50 text-white text-[10px] px-1 rounded">{idx + 1}</div>
                <div className="absolute top-1 right-1 flex gap-0.5">
                  <button onClick={(e) => { e.stopPropagation(); duplicateSlide(slide.id) }} className="bg-black/50 text-white text-[10px] px-1 rounded hover:bg-black/70">⧉</button>
                  {presentation.slides.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); removeSlide(slide.id) }} className="bg-red-500/80 text-white text-[10px] px-1 rounded hover:bg-red-600">✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main canvas area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div ref={canvasRef} className="flex-1 overflow-auto flex items-center justify-center p-8" onClick={(e) => { if (e.target === e.currentTarget) setSelectedIds([]) }}>
            {currentSlide ? (
              <div className="relative shadow-2xl" style={{ width: SLIDE_W * zoom, height: SLIDE_H * zoom }}>
                <div className="absolute inset-0 origin-top-left" style={{ transform: `scale(${zoom})` }}>
                  <SlideCanvas
                    slide={currentSlide}
                    zoom={zoom}
                    selectedIds={selectedIds}
                    onSelect={setSelectedIds}
                    onUpdate={updateObject}
                    onAddText={addTextObject}
                    onAddShape={addShapeObject}
                    editingText={editingText}
                    setEditingText={setEditingText}
                    tool={tool}
                    gridEnabled={gridEnabled}
                  />
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-sm">No slides yet. Click &quot;Insert Slide&quot; to begin.</div>
            )}
          </div>

          {/* Notes panel */}
          {notesVisible && currentSlide && (
            <div className="h-32 bg-white border-t border-gray-200 p-3 flex-shrink-0">
              <div className="text-xs font-medium text-gray-500 mb-1">Speaker Notes</div>
              <textarea
                value={currentSlide.notes.text}
                onChange={(e) => commit(p => ({
                  ...p,
                  slides: p.slides.map(s => s.id === currentSlideId ? { ...s, notes: { ...s.notes, text: e.target.value } } : s)
                }))}
                className="w-full h-full text-sm border border-gray-200 rounded p-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Add speaker notes..."
              />
            </div>
          )}
        </div>

        {/* Properties panel */}
        {selectedIds.length > 0 && currentSlide && (
          <PropertiesPanel
            objects={currentSlide.objects.filter(o => selectedIds.includes(o.id))}
            onUpdate={updateObject}
            onDelete={() => removeObject(selectedIds)}
          />
        )}
      </div>
    </div>
  )
}

function ToolBtn({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-colors ${active ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
    >
      {icon}
    </button>
  )
}

function PropertiesPanel({ objects, onUpdate, onDelete }: { objects: SlideObject[]; onUpdate: (id: string, u: Partial<SlideObject>) => void; onDelete: () => void }) {
  if (objects.length === 0) return null
  const obj = objects[0]
  return (
    <div className="w-56 bg-white border-l border-gray-200 flex flex-col flex-shrink-0 overflow-y-auto">
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">Properties</span>
        <button onClick={onDelete} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
      </div>
      <div className="p-3 space-y-3">
        <PropField label="X" value={Math.round(obj.x)} onChange={v => onUpdate(obj.id, { x: Number(v) })} type="number" />
        <PropField label="Y" value={Math.round(obj.y)} onChange={v => onUpdate(obj.id, { y: Number(v) })} type="number" />
        <PropField label="W" value={Math.round(obj.width)} onChange={v => onUpdate(obj.id, { width: Number(v) })} type="number" />
        <PropField label="H" value={Math.round(obj.height)} onChange={v => onUpdate(obj.id, { height: Number(v) })} type="number" />
        <PropField label="Rotation" value={Math.round(obj.rotation)} onChange={v => onUpdate(obj.id, { rotation: Number(v) })} type="number" />
        <PropField label="Opacity" value={obj.opacity} onChange={v => onUpdate(obj.id, { opacity: Number(v) })} type="number" step={0.1} min={0} max={1} />
        {obj.type === 'text' && (
          <>
            <PropField label="Font Size" value={(obj as TextObject).fontSize} onChange={v => onUpdate(obj.id, { fontSize: Number(v) } as never)} type="number" />
            <PropField label="Color" value={(obj as TextObject).color} onChange={v => onUpdate(obj.id, { color: v } as never)} type="color" />
            <div className="flex gap-1">
              <button onClick={() => onUpdate(obj.id, { fontWeight: (obj as TextObject).fontWeight === 'bold' ? 'normal' : 'bold' } as never)} className={`px-2 py-1 text-xs rounded border ${(obj as TextObject).fontWeight === 'bold' ? 'bg-gray-200' : ''}`}>B</button>
              <button onClick={() => onUpdate(obj.id, { fontStyle: (obj as TextObject).fontStyle === 'italic' ? 'normal' : 'italic' } as never)} className={`px-2 py-1 text-xs rounded border italic ${(obj as TextObject).fontStyle === 'italic' ? 'bg-gray-200' : ''}`}>I</button>
            </div>
            <div className="flex gap-1">
              {(['left', 'center', 'right'] as const).map(a => (
                <button key={a} onClick={() => onUpdate(obj.id, { textAlign: a } as never)} className={`px-2 py-1 text-xs rounded border ${(obj as TextObject).textAlign === a ? 'bg-gray-200' : ''}`}>{a[0].toUpperCase()}</button>
              ))}
            </div>
          </>
        )}
        {obj.type === 'shape' && (
          <>
            <PropField label="Fill" value={(obj as ShapeObject).fill} onChange={v => onUpdate(obj.id, { fill: v } as never)} type="color" />
            <PropField label="Stroke" value={(obj as ShapeObject).stroke} onChange={v => onUpdate(obj.id, { stroke: v } as never)} type="color" />
          </>
        )}
      </div>
    </div>
  )
}

function PropField({ label, value, onChange, type = 'text', step, min, max }: {
  label: string; value: string | number; onChange: (v: string) => void; type?: string; step?: number; min?: number; max?: number
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-[10px] text-gray-400 w-14 text-right flex-shrink-0">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        step={step}
        min={min}
        max={max}
        className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )
}

function SlideCanvas({
  slide,
  isThumbnail = false,
  isPresentMode = false,
  selectedIds,
  onSelect,
  onUpdate,
  editingText,
  setEditingText,
  tool,
  gridEnabled
}: {
  slide: Slide
  zoom: number
  isThumbnail?: boolean
  isPresentMode?: boolean
  selectedIds?: string[]
  onSelect?: (ids: string[]) => void
  onUpdate?: (id: string, u: Partial<SlideObject>) => void
  onAddText?: () => void
  onAddShape?: (t: ShapeObject['shapeType']) => void
  editingText?: string | null
  setEditingText?: (id: string | null) => void
  tool?: Tool
  gridEnabled?: boolean
}) {
  const sorted = [...slide.objects].sort((a, b) => a.zIndex - b.zIndex).filter(o => o.visible)

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: SLIDE_W,
        height: SLIDE_H,
        background: slide.background,
        cursor: tool === 'text' ? 'text' : tool === 'shape' ? 'crosshair' : 'default'
      }}
    >
      {gridEnabled && !isPresentMode && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
          {Array.from({ length: Math.ceil(SLIDE_W / 40) + 1 }, (_, i) => (
            <line key={`v${i}`} x1={i * 40} y1={0} x2={i * 40} y2={SLIDE_H} stroke="#94a3b8" strokeWidth={0.5} />
          ))}
          {Array.from({ length: Math.ceil(SLIDE_H / 40) + 1 }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 40} x2={SLIDE_W} y2={i * 40} stroke="#94a3b8" strokeWidth={0.5} />
          ))}
        </svg>
      )}
      {sorted.map(obj => (
        <SlideObjectRenderer
          key={obj.id}
          object={obj}
          isThumbnail={isThumbnail}
          isPresentMode={isPresentMode}
          isSelected={selectedIds?.includes(obj.id) ?? false}
          onSelect={() => onSelect?.([obj.id])}
          onUpdate={(u) => onUpdate?.(obj.id, u)}
          editingText={editingText === obj.id}
          setEditingText={(v) => setEditingText?.(v ? obj.id : null)}
        />
      ))}
    </div>
  )
}

function SlideObjectRenderer({
  object: obj,
  isThumbnail,
  isPresentMode,
  isSelected,
  onSelect,
  onUpdate,
  editingText,
  setEditingText
}: {
  object: SlideObject
  isThumbnail: boolean
  isPresentMode: boolean
  isSelected: boolean
  onSelect: () => void
  onUpdate: (u: Partial<SlideObject>) => void
  editingText: boolean
  setEditingText: (v: boolean) => void
}) {
  const [localText, setLocalText] = useState('')

  const handleDoubleClick = () => {
    if (obj.type === 'text' && !isPresentMode && !isThumbnail) {
      setLocalText((obj as TextObject).text)
      setEditingText(true)
    }
  }

  const handleTextBlur = () => {
    onUpdate({ text: localText } as never)
    setEditingText(false)
  }

  const handleClick = (e: React.MouseEvent) => {
    if (!isPresentMode) {
      e.stopPropagation()
      onSelect()
    }
  }

  if (obj.type === 'text') {
    const textObj = obj as TextObject
    return (
      <div
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className={`absolute ${!isPresentMode && isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
        style={{
          left: obj.x,
          top: obj.y,
          width: obj.width,
          height: obj.height,
          transform: `rotate(${obj.rotation}deg)`,
          opacity: obj.opacity,
          zIndex: obj.zIndex,
          cursor: isPresentMode ? 'default' : 'move'
        }}
      >
        {editingText ? (
          <textarea
            autoFocus
            value={localText}
            onChange={e => setLocalText(e.target.value)}
            onBlur={handleTextBlur}
            className="w-full h-full border-none outline-none resize-none bg-transparent"
            style={{
              fontSize: textObj.fontSize,
              fontFamily: textObj.fontFamily,
              fontWeight: textObj.fontWeight,
              fontStyle: textObj.fontStyle,
              textDecoration: textObj.textDecoration,
              textAlign: textObj.textAlign,
              color: textObj.color,
              lineHeight: textObj.lineHeight
            }}
          />
        ) : (
          <div
            className="w-full h-full whitespace-pre-wrap overflow-hidden"
            style={{
              fontSize: textObj.fontSize,
              fontFamily: textObj.fontFamily,
              fontWeight: textObj.fontWeight,
              fontStyle: textObj.fontStyle,
              textDecoration: textObj.textDecoration,
              textAlign: textObj.textAlign,
              color: textObj.color,
              lineHeight: textObj.lineHeight
            }}
          >
            {textObj.text}
          </div>
        )}
      </div>
    )
  }

  if (obj.type === 'shape') {
    const shapeObj = obj as ShapeObject
    return (
      <div
        onClick={handleClick}
        className={`absolute ${!isPresentMode && isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
        style={{
          left: obj.x,
          top: obj.y,
          width: obj.width,
          height: obj.height,
          transform: `rotate(${obj.rotation}deg)`,
          opacity: obj.opacity,
          zIndex: obj.zIndex,
          cursor: isPresentMode ? 'default' : 'move'
        }}
      >
        {shapeObj.shapeType === 'ellipse' ? (
          <div className="w-full h-full rounded-full" style={{ background: shapeObj.fill, border: `${shapeObj.strokeWidth}px solid ${shapeObj.stroke}` }} />
        ) : shapeObj.shapeType === 'triangle' ? (
          <div className="w-full h-full" style={{
            background: 'transparent',
            borderLeft: `${obj.width / 2}px solid transparent`,
            borderRight: `${obj.width / 2}px solid transparent`,
            borderBottom: `${obj.height}px solid ${shapeObj.fill}`
          }} />
        ) : (
          <div className="w-full h-full" style={{ background: shapeObj.fill, border: `${shapeObj.strokeWidth}px solid ${shapeObj.stroke}` }} />
        )}
      </div>
    )
  }

  if (obj.type === 'image') {
    const imgObj = obj as ImageObject
    return (
      <div
        onClick={handleClick}
        className={`absolute ${!isPresentMode && isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
        style={{
          left: obj.x,
          top: obj.y,
          width: obj.width,
          height: obj.height,
          transform: `rotate(${obj.rotation}deg)`,
          opacity: obj.opacity,
          zIndex: obj.zIndex,
          cursor: isPresentMode ? 'default' : 'move'
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgObj.src} alt="" className="w-full h-full object-cover" draggable={false} />
      </div>
    )
  }

  if (obj.type === 'table') {
    const tblObj = obj as TableObject
    const { rows, cols, cells } = tblObj.data
    return (
      <div
        onClick={handleClick}
        className={`absolute ${!isPresentMode && isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
        style={{
          left: obj.x,
          top: obj.y,
          width: obj.width,
          height: obj.height,
          transform: `rotate(${obj.rotation}deg)`,
          opacity: obj.opacity,
          zIndex: obj.zIndex,
          cursor: isPresentMode ? 'default' : 'move'
        }}
      >
        <table className="w-full h-full border-collapse">
          <tbody>
            {cells.slice(0, rows).map((row, ri) => (
              <tr key={ri}>
                {row.slice(0, cols).map((cell, ci) => (
                  <td
                    key={ci}
                    className="border px-1 text-xs"
                    style={{
                      borderColor: cell.stroke,
                      background: cell.fill,
                      color: cell.color,
                      fontWeight: cell.fontWeight,
                      fontStyle: cell.fontStyle,
                      textAlign: cell.textAlign,
                      fontSize: cell.fontSize
                    }}
                  >
                    {cell.text}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return null
}
