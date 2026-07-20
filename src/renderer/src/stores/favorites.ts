import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FavoriteItem } from '../types'

interface FavoritesState {
  items: FavoriteItem[]
  toggle: (item: FavoriteItem) => void
  isFavorite: (key: string) => boolean
  forServer: (serverId: string) => FavoriteItem[]
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) =>
        set((state) => {
          const exists = state.items.some((f) => f.key === item.key)
          return {
            items: exists ? state.items.filter((f) => f.key !== item.key) : [...state.items, item]
          }
        }),
      isFavorite: (key) => get().items.some((f) => f.key === key),
      forServer: (serverId) => get().items.filter((f) => f.serverId === serverId)
    }),
    { name: 'xiptv-favorites' }
  )
)
