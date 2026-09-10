import type { SlideLayout, SlideTransition } from './types'

export const SLIDE_LAYOUTS: SlideLayout[] = [
  {
    type: 'blank',
    name: 'Blank',
    description: 'Empty slide with no placeholders',
    objects: []
  },
  {
    type: 'title',
    name: 'Title Slide',
    description: 'Slide with centered title and subtitle',
    objects: [
      {
        type: 'text',
        x: 40,
        y: 160,
        width: 880,
        height: 120,
        text: 'Click to add title',
        fontSize: 36,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#1e293b'
      },
      {
        type: 'text',
        x: 140,
        y: 300,
        width: 680,
        height: 60,
        text: 'Click to add subtitle',
        fontSize: 20,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        textAlign: 'center',
        color: '#64748b'
      }
    ]
  },
  {
    type: 'titleContent',
    name: 'Title and Content',
    description: 'Slide with title at top and content area',
    objects: [
      {
        type: 'text',
        x: 40,
        y: 20,
        width: 880,
        height: 80,
        text: 'Click to add title',
        fontSize: 28,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        textAlign: 'left',
        color: '#1e293b'
      },
      {
        type: 'shape',
        shapeType: 'rect',
        x: 40,
        height: 2,
        width: 880,
        y: 100,
        fill: '#3b82f6',
        stroke: 'transparent',
        strokeWidth: 0
      },
      {
        type: 'text',
        x: 40,
        y: 120,
        width: 880,
        height: 420,
        text: 'Click to add content',
        fontSize: 18,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        textAlign: 'left',
        color: '#334155'
      }
    ]
  },
  {
    type: 'twoColumn',
    name: 'Two Column',
    description: 'Slide with title and two equal content columns',
    objects: [
      {
        type: 'text',
        x: 40,
        y: 20,
        width: 880,
        height: 80,
        text: 'Click to add title',
        fontSize: 28,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        textAlign: 'left',
        color: '#1e293b'
      },
      {
        type: 'shape',
        shapeType: 'rect',
        x: 40,
        height: 2,
        width: 880,
        y: 100,
        fill: '#3b82f6',
        stroke: 'transparent',
        strokeWidth: 0
      },
      {
        type: 'text',
        x: 40,
        y: 120,
        width: 420,
        height: 420,
        text: 'Left column',
        fontSize: 18,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        textAlign: 'left',
        color: '#334155'
      },
      {
        type: 'text',
        x: 500,
        y: 120,
        width: 420,
        height: 420,
        text: 'Right column',
        fontSize: 18,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        textAlign: 'left',
        color: '#334155'
      }
    ]
  },
  {
    type: 'sectionHeader',
    name: 'Section Header',
    description: 'Slide with large centered title for section breaks',
    objects: [
      {
        type: 'shape',
        shapeType: 'rect',
        x: 0,
        y: 0,
        width: 960,
        height: 540,
        fill: '#1e293b',
        stroke: 'transparent',
        strokeWidth: 0
      },
      {
        type: 'text',
        x: 40,
        y: 180,
        width: 880,
        height: 100,
        text: 'Section Title',
        fontSize: 40,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#ffffff'
      },
      {
        type: 'text',
        x: 140,
        y: 300,
        width: 680,
        height: 60,
        text: 'Section subtitle',
        fontSize: 20,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        textAlign: 'center',
        color: '#94a3b8'
      }
    ]
  }
]

export function getLayout(type: SlideLayout['type']): SlideLayout {
  return SLIDE_LAYOUTS.find(l => l.type === type) ?? SLIDE_LAYOUTS[0]
}

export function createDefaultSlide(layoutType: SlideLayout['type'] = 'blank') {
  const layout = getLayout(layoutType)
  const transition: SlideTransition = { type: 'none', duration: 500 }
  return {
    id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    order: 0,
    layout: layoutType,
    background: '#ffffff',
    objects: layout.objects.map((obj, i) => ({
      id: `obj-${Date.now()}-${i}`,
      x: obj.x ?? 0,
      y: obj.y ?? 0,
      width: obj.width ?? 200,
      height: obj.height ?? 100,
      rotation: 0,
      zIndex: i,
      fill: obj.fill ?? 'transparent',
      stroke: obj.stroke ?? 'transparent',
      strokeWidth: obj.strokeWidth ?? 0,
      opacity: 1,
      locked: false,
      visible: true,
      data: {},
      ...obj
    })),
    transition,
    notes: { text: '' }
  }
}
