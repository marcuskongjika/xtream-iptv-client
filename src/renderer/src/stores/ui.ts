import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Section, Theme, ViewMode } from '../types'

interface UIState {
  theme: Theme
  viewMode: ViewMode
  section: Section
  searchQuery: string
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setViewMode: (mode: ViewMode) => void
  setSection: (section: Section) => void
  setSearchQuery: (query: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'dark',
      viewMode: 'grid',
      section: 'live',
      searchQuery: '',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setViewMode: (viewMode) => set({ viewMode }),
      setSection: (section) => set({ section }),
      setSearchQuery: (searchQuery) => set({ searchQuery })
    }),
    {
      name: 'xiptv-ui',
      partialize: (state) => ({ theme: state.theme, viewMode: state.viewMode })
    }
  )
)
