import { create } from 'zustand'
import type { PlayItem } from '../types'
import { useHistoryStore } from './history'

interface PlayerState {
  item: PlayItem | null
  play: (item: PlayItem) => void
  close: () => void
}

export const usePlayerStore = create<PlayerState>((set) => ({
  item: null,

  play: (item) => {
    useHistoryStore.getState().record({
      key: item.key,
      serverId: item.serverId,
      type: item.type,
      id: item.id,
      name: item.title,
      subtitle: item.subtitle,
      image: item.image,
      ext: item.ext,
      playedAt: Date.now()
    })
    set({ item })
  },

  close: () => set({ item: null })
}))
