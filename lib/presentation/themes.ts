import type { Theme } from './types'

export const DEFAULT_THEMES: Theme[] = [
  {
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
  {
    id: 'business',
    name: 'Business',
    colors: {
      primary: '#1e3a5f',
      secondary: '#2563eb',
      accent: '#0891b2',
      background: '#ffffff',
      text: '#0f172a',
      textLight: '#475569',
      border: '#cbd5e1'
    },
    fonts: { heading: 'Georgia', body: 'Arial', mono: 'Courier New' }
  },
  {
    id: 'creative',
    name: 'Creative',
    colors: {
      primary: '#ec4899',
      secondary: '#8b5cf6',
      accent: '#f59e0b',
      background: '#fefce8',
      text: '#1e1b4b',
      textLight: '#6b7280',
      border: '#d4d4d8'
    },
    fonts: { heading: 'Verdana', body: 'Verdana', mono: 'Courier New' }
  },
  {
    id: 'dark',
    name: 'Dark',
    colors: {
      primary: '#818cf8',
      secondary: '#c084fc',
      accent: '#34d399',
      background: '#0f172a',
      text: '#f8fafc',
      textLight: '#94a3b8',
      border: '#334155'
    },
    fonts: { heading: 'Arial', body: 'Arial', mono: 'Courier New' }
  },
  {
    id: 'minimal',
    name: 'Minimal',
    colors: {
      primary: '#111827',
      secondary: '#374151',
      accent: '#6b7280',
      background: '#ffffff',
      text: '#111827',
      textLight: '#9ca3af',
      border: '#f3f4f6'
    },
    fonts: { heading: 'Helvetica Neue', body: 'Helvetica Neue', mono: 'Courier New' }
  },
  {
    id: 'nature',
    name: 'Nature',
    colors: {
      primary: '#059669',
      secondary: '#0d9488',
      accent: '#65a30d',
      background: '#f0fdf4',
      text: '#14532d',
      textLight: '#4ade80',
      border: '#bbf7d0'
    },
    fonts: { heading: 'Georgia', body: 'Arial', mono: 'Courier New' }
  },
  {
    id: 'ocean',
    name: 'Ocean',
    colors: {
      primary: '#0284c7',
      secondary: '#0ea5e9',
      accent: '#06b6d4',
      background: '#f0f9ff',
      text: '#0c4a6e',
      textLight: '#38bdf8',
      border: '#bae6fd'
    },
    fonts: { heading: 'Arial', body: 'Arial', mono: 'Courier New' }
  },
  {
    id: 'sunset',
    name: 'Sunset',
    colors: {
      primary: '#dc2626',
      secondary: '#ea580c',
      accent: '#f59e0b',
      background: '#fffbeb',
      text: '#7c2d12',
      textLight: '#fb923c',
      border: '#fed7aa'
    },
    fonts: { heading: 'Georgia', body: 'Arial', mono: 'Courier New' }
  }
]

export function getTheme(id: string): Theme {
  return DEFAULT_THEMES.find(t => t.id === id) ?? DEFAULT_THEMES[0]
}
