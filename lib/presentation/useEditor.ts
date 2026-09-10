'use client'

import { useReducer, useCallback, useEffect } from 'react'
import type { Presentation, Slide, SlideObject, Theme, EditorState, EditorAction, SlideLayoutType } from '@/lib/presentation/types'
import { deepClone, createSlideId, createId } from '@/lib/presentation/engine'
import { createDefaultSlide } from '@/lib/presentation/layouts'
import { downloadPresentation } from '@/lib/presentation/export'
import { importPptx } from '@/lib/presentation/import'

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_PRESENTATION': {
      const pres = action.payload as Presentation
      return {
        ...state,
        presentation: pres,
        currentSlideId: pres.slides[0]?.id ?? null,
        selectedObjectIds: [],
        history: [deepClone(pres)],
        historyIndex: 0,
        isModified: false
      }
    }
    case 'ADD_SLIDE': {
      if (!state.presentation) return state
      const { layout } = action.payload as { layout: SlideLayoutType }
      const slide = createDefaultSlide(layout)
      slide.order = state.presentation.slides.length
      const pres = { ...state.presentation, slides: [...state.presentation.slides, slide] }
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(deepClone(pres))
      return { ...state, presentation: pres, currentSlideId: slide.id, history: newHistory, historyIndex: newHistory.length - 1, isModified: true }
    }
    case 'REMOVE_SLIDE': {
      if (!state.presentation) return state
      const { slideId } = action.payload as { slideId: string }
      const idx = state.presentation.slides.findIndex(s => s.id === slideId)
      if (idx === -1) return state
      const slides = state.presentation.slides.filter(s => s.id !== slideId).map((s, i) => ({ ...s, order: i }))
      const pres = { ...state.presentation, slides }
      const newCurrentId = state.currentSlideId === slideId ? (slides[0]?.id ?? null) : state.currentSlideId
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(deepClone(pres))
      return { ...state, presentation: pres, currentSlideId: newCurrentId, selectedObjectIds: [], history: newHistory, historyIndex: newHistory.length - 1, isModified: true }
    }
    case 'DUPLICATE_SLIDE': {
      if (!state.presentation) return state
      const { slideId } = action.payload as { slideId: string }
      const src = state.presentation.slides.find(s => s.id === slideId)
      if (!src) return state
      const dup: Slide = { ...deepClone(src), id: createSlideId(), order: state.presentation.slides.length, objects: src.objects.map(o => ({ ...deepClone(o), id: createId() })) }
      const slides = [...state.presentation.slides, dup].map((s, i) => ({ ...s, order: i }))
      const pres = { ...state.presentation, slides }
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(deepClone(pres))
      return { ...state, presentation: pres, currentSlideId: dup.id, history: newHistory, historyIndex: newHistory.length - 1, isModified: true }
    }
    case 'REORDER_SLIDES': {
      if (!state.presentation) return state
      const { fromIndex, toIndex } = action.payload as { fromIndex: number; toIndex: number }
      const slides = [...state.presentation.slides]
      const [moved] = slides.splice(fromIndex, 1)
      slides.splice(toIndex, 0, moved)
      const ordered = slides.map((s, i) => ({ ...s, order: i }))
      const pres = { ...state.presentation, slides: ordered }
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(deepClone(pres))
      return { ...state, presentation: pres, history: newHistory, historyIndex: newHistory.length - 1, isModified: true }
    }
    case 'UPDATE_SLIDE': {
      if (!state.presentation) return state
      const { slideId, updates } = action.payload as { slideId: string; updates: Partial<Slide> }
      const slides = state.presentation.slides.map(s => s.id === slideId ? { ...s, ...updates } : s)
      const pres = { ...state.presentation, slides }
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(deepClone(pres))
      return { ...state, presentation: pres, history: newHistory, historyIndex: newHistory.length - 1, isModified: true }
    }
    case 'SELECT_SLIDE':
      return { ...state, currentSlideId: action.payload as string, selectedObjectIds: [] }
    case 'ADD_OBJECT': {
      if (!state.presentation || !state.currentSlideId) return state
      const obj = action.payload as SlideObject
      const slides = state.presentation.slides.map(s =>
        s.id === state.currentSlideId ? { ...s, objects: [...s.objects, obj] } : s
      )
      const pres = { ...state.presentation, slides }
      return { ...state, presentation: pres, selectedObjectIds: [obj.id], isModified: true }
    }
    case 'UPDATE_OBJECT': {
      if (!state.presentation || !state.currentSlideId) return state
      const { objectId, updates } = action.payload as { objectId: string; updates: Partial<SlideObject> }
      const slides = state.presentation.slides.map(s =>
        s.id === state.currentSlideId
          ? { ...s, objects: s.objects.map(o => o.id === objectId ? { ...o, ...updates } : o) }
          : s
      )
      const pres = { ...state.presentation, slides }
      return { ...state, presentation: pres, isModified: true }
    }
    case 'REMOVE_OBJECT': {
      if (!state.presentation || !state.currentSlideId) return state
      const { objectIds } = action.payload as { objectIds: string[] }
      const slides = state.presentation.slides.map(s =>
        s.id === state.currentSlideId
          ? { ...s, objects: s.objects.filter(o => !objectIds.includes(o.id)) }
          : s
      )
      const pres = { ...state.presentation, slides }
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(deepClone(pres))
      return { ...state, presentation: pres, selectedObjectIds: [], history: newHistory, historyIndex: newHistory.length - 1, isModified: true }
    }
    case 'SELECT_OBJECTS':
      return { ...state, selectedObjectIds: action.payload as string[] }
    case 'CLEAR_SELECTION':
      return { ...state, selectedObjectIds: [] }
    case 'SET_TOOL':
      return { ...state, tool: action.payload as EditorState['tool'] }
    case 'SET_ZOOM':
      return { ...state, zoom: Math.max(0.25, Math.min(3, action.payload as number)) }
    case 'UNDO': {
      if (state.historyIndex <= 0) return state
      const newIndex = state.historyIndex - 1
      const pres = deepClone(state.history[newIndex]) as Presentation
      return { ...state, presentation: pres, historyIndex: newIndex, selectedObjectIds: [] }
    }
    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state
      const newIndex = state.historyIndex + 1
      const pres = deepClone(state.history[newIndex]) as Presentation
      return { ...state, presentation: pres, historyIndex: newIndex, selectedObjectIds: [] }
    }
    case 'COPY': {
      if (!state.presentation || !state.currentSlideId) return state
      const currentSlide = state.presentation.slides.find(s => s.id === state.currentSlideId)
      if (!currentSlide) return state
      const selected = currentSlide.objects.filter(o => state.selectedObjectIds.includes(o.id))
      return { ...state, clipboard: deepClone(selected) }
    }
    case 'CUT': {
      if (!state.presentation || !state.currentSlideId) return state
      const currentSlide = state.presentation.slides.find(s => s.id === state.currentSlideId)
      if (!currentSlide) return state
      const selected = currentSlide.objects.filter(o => state.selectedObjectIds.includes(o.id))
      const slides = state.presentation.slides.map(s =>
        s.id === state.currentSlideId
          ? { ...s, objects: s.objects.filter(o => !state.selectedObjectIds.includes(o.id)) }
          : s
      )
      const pres = { ...state.presentation, slides }
      return { ...state, presentation: pres, clipboard: deepClone(selected), selectedObjectIds: [] }
    }
    case 'PASTE': {
      if (!state.presentation || !state.currentSlideId || state.clipboard.length === 0) return state
      const pasted = state.clipboard.map(o => {
        const newObj = deepClone(o) as SlideObject
        newObj.id = createId()
        newObj.x += 20
        newObj.y += 20
        return newObj
      })
      const slides = state.presentation.slides.map(s =>
        s.id === state.currentSlideId ? { ...s, objects: [...s.objects, ...pasted] } : s
      )
      const pres = { ...state.presentation, slides }
      return { ...state, presentation: pres, selectedObjectIds: pasted.map(o => o.id), clipboard: state.clipboard }
    }
    case 'DUPLICATE_OBJECT': {
      if (!state.presentation || !state.currentSlideId) return state
      const currentSlide = state.presentation.slides.find(s => s.id === state.currentSlideId)
      if (!currentSlide) return state
      const selected = currentSlide.objects.filter(o => state.selectedObjectIds.includes(o.id))
      const dupes = selected.map(o => {
        const d = deepClone(o) as SlideObject
        d.id = createId()
        d.x += 20
        d.y += 20
        return d
      })
      const slides = state.presentation.slides.map(s =>
        s.id === state.currentSlideId ? { ...s, objects: [...s.objects, ...dupes] } : s
      )
      const pres = { ...state.presentation, slides }
      return { ...state, presentation: pres, selectedObjectIds: dupes.map(o => o.id), isModified: true }
    }
    case 'SET_THEME':
      return { ...state, presentation: state.presentation ? { ...state.presentation, theme: action.payload as Theme } : state.presentation }
    case 'UPDATE_THEME':
      return { ...state, presentation: state.presentation ? { ...state.presentation, theme: { ...state.presentation.theme, ...(action.payload as Partial<Theme>) } } : state.presentation }
    case 'TOGGLE_GRID':
      return { ...state, gridEnabled: !state.gridEnabled }
    case 'TOGGLE_GUIDES':
      return { ...state, guidesEnabled: !state.guidesEnabled }
    case 'TOGGLE_NOTES':
      return { ...state, notesVisible: !state.notesVisible }
    case 'SET_PRESENTATION_MODE':
      return { ...state, presentationMode: action.payload as boolean }
    case 'SET_MODIFIED':
      return { ...state, isModified: action.payload as boolean }
    case 'BRING_FORWARD': {
      if (!state.presentation || !state.currentSlideId) return state
      const slides = state.presentation.slides.map(s => {
        if (s.id !== state.currentSlideId) return s
        const objs = [...s.objects]
        for (let i = objs.length - 2; i >= 0; i--) {
          if (state.selectedObjectIds.includes(objs[i].id)) {
            ;[objs[i], objs[i + 1]] = [objs[i + 1], objs[i]]
          }
        }
        return { ...s, objects: objs.map((o, i) => ({ ...o, zIndex: i })) }
      })
      return { ...state, presentation: { ...state.presentation, slides }, isModified: true }
    }
    case 'SEND_BACKWARD': {
      if (!state.presentation || !state.currentSlideId) return state
      const slides = state.presentation.slides.map(s => {
        if (s.id !== state.currentSlideId) return s
        const objs = [...s.objects]
        for (let i = 1; i < objs.length; i++) {
          if (state.selectedObjectIds.includes(objs[i].id)) {
            ;[objs[i - 1], objs[i]] = [objs[i], objs[i - 1]]
          }
        }
        return { ...s, objects: objs.map((o, i) => ({ ...o, zIndex: i })) }
      })
      return { ...state, presentation: { ...state.presentation, slides }, isModified: true }
    }
    case 'ALIGN_OBJECTS': {
      if (!state.presentation || !state.currentSlideId) return state
      const { alignment } = action.payload as { alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' }
      const slides = state.presentation.slides.map(s => {
        if (s.id !== state.currentSlideId) return s
        const objs = s.objects.map(o => ({ ...o }))
        const selected = objs.filter(o => state.selectedObjectIds.includes(o.id))
        if (selected.length < 2) return s
        const minX = Math.min(...selected.map(o => o.x))
        const maxX = Math.max(...selected.map(o => o.x + o.width))
        const minY = Math.min(...selected.map(o => o.y))
        const maxY = Math.max(...selected.map(o => o.y + o.height))
        const centerX = (minX + maxX) / 2
        const centerY = (minY + maxY) / 2
        for (const obj of selected) {
          switch (alignment) {
            case 'left': obj.x = minX; break
            case 'center': obj.x = centerX - obj.width / 2; break
            case 'right': obj.x = maxX - obj.width; break
            case 'top': obj.y = minY; break
            case 'middle': obj.y = centerY - obj.height / 2; break
            case 'bottom': obj.y = maxY - obj.height; break
          }
        }
        return { ...s, objects: objs }
      })
      return { ...state, presentation: { ...state.presentation, slides }, isModified: true }
    }
    default:
      return state
  }
}

export function usePresentationEditor(initialPresentation?: Presentation) {
  const [state, dispatch] = useReducer(reducer, {
    presentation: initialPresentation ?? null,
    currentSlideId: initialPresentation?.slides[0]?.id ?? null,
    selectedObjectIds: [],
    zoom: 1,
    tool: 'select',
    isDragging: false,
    isResizing: false,
    isRotating: false,
    clipboard: [],
    history: initialPresentation ? [deepClone(initialPresentation)] : [],
    historyIndex: 0,
    gridEnabled: false,
    guidesEnabled: true,
    notesVisible: false,
    presentationMode: false,
    isModified: false
  })

  const currentSlide = state.presentation?.slides.find(s => s.id === state.currentSlideId) ?? null

  const addSlide = useCallback((layout: SlideLayoutType = 'blank') => {
    dispatch({ type: 'ADD_SLIDE', payload: { layout } })
  }, [])

  const removeSlide = useCallback((slideId: string) => {
    dispatch({ type: 'REMOVE_SLIDE', payload: { slideId } })
  }, [])

  const duplicateSlide = useCallback((slideId: string) => {
    dispatch({ type: 'DUPLICATE_SLIDE', payload: { slideId } })
  }, [])

  const selectSlide = useCallback((slideId: string) => {
    dispatch({ type: 'SELECT_SLIDE', payload: slideId })
  }, [])

  const updateSlide = useCallback((slideId: string, updates: Partial<Slide>) => {
    dispatch({ type: 'UPDATE_SLIDE', payload: { slideId, updates } })
  }, [])

  const addObject = useCallback((obj: SlideObject) => {
    dispatch({ type: 'ADD_OBJECT', payload: obj })
  }, [])

  const updateObject = useCallback((objectId: string, updates: Partial<SlideObject>) => {
    dispatch({ type: 'UPDATE_OBJECT', payload: { objectId, updates } })
  }, [])

  const removeObject = useCallback((objectIds: string[]) => {
    dispatch({ type: 'REMOVE_OBJECT', payload: { objectIds } })
  }, [])

  const selectObjects = useCallback((ids: string[]) => {
    dispatch({ type: 'SELECT_OBJECTS', payload: ids })
  }, [])

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' })
  }, [])

  const setTool = useCallback((tool: EditorState['tool']) => {
    dispatch({ type: 'SET_TOOL', payload: tool })
  }, [])

  const setZoom = useCallback((zoom: number) => {
    dispatch({ type: 'SET_ZOOM', payload: zoom })
  }, [])

  const undo = useCallback(() => { dispatch({ type: 'UNDO' }) }, [])
  const redo = useCallback(() => { dispatch({ type: 'REDO' }) }, [])
  const copy = useCallback(() => { dispatch({ type: 'COPY' }) }, [])
  const cut = useCallback(() => { dispatch({ type: 'CUT' }) }, [])
  const paste = useCallback(() => { dispatch({ type: 'PASTE' }) }, [])
  const duplicateObject = useCallback(() => { dispatch({ type: 'DUPLICATE_OBJECT' }) }, [])

  const setTheme = useCallback((theme: Theme) => {
    dispatch({ type: 'SET_THEME', payload: theme })
  }, [])

  const toggleGrid = useCallback(() => { dispatch({ type: 'TOGGLE_GRID' }) }, [])
  const toggleGuides = useCallback(() => { dispatch({ type: 'TOGGLE_GUIDES' }) }, [])
  const toggleNotes = useCallback(() => { dispatch({ type: 'TOGGLE_NOTES' }) }, [])

  const setPresentationMode = useCallback((mode: boolean) => {
    dispatch({ type: 'SET_PRESENTATION_MODE', payload: mode })
  }, [])

  const bringForward = useCallback(() => { dispatch({ type: 'BRING_FORWARD' }) }, [])
  const sendBackward = useCallback(() => { dispatch({ type: 'SEND_BACKWARD' }) }, [])

  const alignObjects = useCallback((alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    dispatch({ type: 'ALIGN_OBJECTS', payload: { alignment } })
  }, [])

  const handleImportPptx = useCallback(async (file: File) => {
    try {
      const pres = await importPptx(file)
      dispatch({ type: 'SET_PRESENTATION', payload: pres })
      return pres
    } catch (err) {
      console.error('Failed to import PPTX:', err)
      return null
    }
  }, [])

  const handleExportPptx = useCallback(async () => {
    if (!state.presentation) return
    await downloadPresentation(state.presentation, 'pptx')
  }, [state.presentation])

  const handleExportPdf = useCallback(async () => {
    if (!state.presentation) return
    await downloadPresentation(state.presentation, 'pdf')
  }, [state.presentation])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
        if (e.key === 'z' && e.shiftKey) { e.preventDefault(); redo() }
        if (e.key === 'y') { e.preventDefault(); redo() }
        if (e.key === 'c') { e.preventDefault(); copy() }
        if (e.key === 'x') { e.preventDefault(); cut() }
        if (e.key === 'v') { e.preventDefault(); paste() }
        if (e.key === 'd') { e.preventDefault(); duplicateObject() }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedObjectIds.length > 0) {
          e.preventDefault()
          removeObject(state.selectedObjectIds)
        }
      }
      if (e.key === 'Escape') {
        if (state.presentationMode) setPresentationMode(false)
        else clearSelection()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.selectedObjectIds, state.presentationMode, undo, redo, copy, cut, paste, duplicateObject, removeObject, setPresentationMode, clearSelection])

  return {
    state,
    currentSlide,
    dispatch,
    addSlide,
    removeSlide,
    duplicateSlide,
    selectSlide,
    updateSlide,
    addObject,
    updateObject,
    removeObject,
    selectObjects,
    clearSelection,
    setTool,
    setZoom,
    undo,
    redo,
    copy,
    cut,
    paste,
    duplicateObject,
    setTheme,
    toggleGrid,
    toggleGuides,
    toggleNotes,
    setPresentationMode,
    bringForward,
    sendBackward,
    alignObjects,
    handleImportPptx,
    handleExportPptx,
    handleExportPdf
  }
}
