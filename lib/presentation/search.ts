import type { Presentation, Slide } from './types'

export interface SearchResult {
  type: 'presentation' | 'slide' | 'object'
  id: string
  slideId?: string
  title: string
  description: string
  relevance: number
}

export function searchPresentations(presentations: Presentation[], query: string): SearchResult[] {
  if (!query.trim()) return []
  const results: SearchResult[] = []
  const q = query.toLowerCase()
  for (const pres of presentations) {
    const titleMatch = pres.title.toLowerCase().includes(q)
    const descMatch = pres.description.toLowerCase().includes(q)
    if (titleMatch || descMatch) {
      results.push({
        type: 'presentation',
        id: pres.id,
        title: pres.title,
        description: pres.description || 'No description',
        relevance: titleMatch ? 1.0 : 0.7
      })
    }
    for (const slide of pres.slides) {
      for (const obj of slide.objects) {
        if (obj.type === 'text') {
          const text = (obj as { text?: string }).text || ''
          if (text.toLowerCase().includes(q)) {
            results.push({
              type: 'object',
              id: obj.id,
              slideId: slide.id,
              title: text.slice(0, 50),
              description: `Slide ${slide.order + 1}`,
              relevance: text.toLowerCase().startsWith(q) ? 0.9 : 0.6
            })
          }
        }
      }
    }
  }
  return results.sort((a, b) => b.relevance - a.relevance)
}

export function filterSlides(slides: Slide[], query: string): Slide[] {
  if (!query.trim()) return slides
  const q = query.toLowerCase()
  return slides.filter(slide => {
    return slide.objects.some(obj => {
      if (obj.type === 'text') {
        return ((obj as { text?: string }).text || '').toLowerCase().includes(q)
      }
      return false
    })
  })
}

export function highlightText(text: string, query: string): { text: string; highlighted: boolean }[] {
  if (!query.trim()) return [{ text, highlighted: false }]
  const q = query.toLowerCase()
  const parts: { text: string; highlighted: boolean }[] = []
  let lastIndex = 0
  let idx = text.toLowerCase().indexOf(q)
  while (idx !== -1) {
    if (idx > lastIndex) {
      parts.push({ text: text.slice(lastIndex, idx), highlighted: false })
    }
    parts.push({ text: text.slice(idx, idx + query.length), highlighted: true })
    lastIndex = idx + query.length
    idx = text.toLowerCase().indexOf(q, lastIndex)
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), highlighted: false })
  }
  return parts
}
