import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { HistoryEntry } from '../types'

const MAX_ENTRIES = 100

interface Position {
  position: number
  duration: number
}

interface HistoryState {
  entries: HistoryEntry[]
  positions: Record<string, Position>
  record: (entry: HistoryEntry) => void
  savePosition: (key: string, position: number, duration: number) => void
  clearPosition: (key: string) => void
  getResumePosition: (key: string) => number | undefined
  clear: () => void
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      entries: [],
      positions: {},

      record: (entry) =>
        set((state) => ({
          entries: [entry, ...state.entries.filter((e) => e.key !== entry.key)].slice(0, MAX_ENTRIES)
        })),

      savePosition: (key, position, duration) =>
        set((state) => ({
          positions: { ...state.positions, [key]: { position, duration } }
        })),

      clearPosition: (key) =>
        set((state) => {
          const positions = { ...state.positions }
          delete positions[key]
          return { positions }
        }),

      /** Only offer resume when meaningfully into the content and not at the end. */
      getResumePosition: (key) => {
        const saved = get().positions[key]
        if (!saved) return undefined
        if (saved.position < 15) return undefined
        if (saved.duration > 0 && saved.position > saved.duration * 0.95) return undefined
        return saved.position
      },

      clear: () => set({ entries: [], positions: {} })
    }),
    { name: 'xiptv-history' }
  )
)
