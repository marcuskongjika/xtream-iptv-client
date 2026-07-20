import { create } from 'zustand'
import type { SeriesItem, VodStream } from '../types'

interface DetailState {
  movie: VodStream | null
  series: SeriesItem | null
  openMovie: (movie: VodStream) => void
  openSeries: (series: SeriesItem) => void
  close: () => void
}

export const useDetailStore = create<DetailState>((set) => ({
  movie: null,
  series: null,
  openMovie: (movie) => set({ movie, series: null }),
  openSeries: (series) => set({ series, movie: null }),
  close: () => set({ movie: null, series: null })
}))
