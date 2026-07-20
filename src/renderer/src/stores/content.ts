import { create } from 'zustand'
import type { XtreamClient } from '../services/xtream'
import type { Category, ContentKind, LiveStream, SeriesItem, VodStream } from '../types'

interface SectionData<T> {
  categories: Category[] | null
  itemsByCategory: Record<string, T[]>
  all: T[] | null
}

interface ContentState {
  live: SectionData<LiveStream>
  vod: SectionData<VodStream>
  series: SectionData<SeriesItem>
  reset: () => void
  loadCategories: (client: XtreamClient, kind: ContentKind) => Promise<Category[]>
  loadItems: (client: XtreamClient, kind: ContentKind, categoryId: string) => Promise<unknown[]>
  loadAll: (client: XtreamClient, kind: ContentKind) => Promise<unknown[]>
}

const emptySection = <T,>(): SectionData<T> => ({
  categories: null,
  itemsByCategory: {},
  all: null
})

/** De-duplicate concurrent requests for the same resource. */
const inflight = new Map<string, Promise<unknown>>()

function dedupe<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key)
  if (existing) return existing as Promise<T>
  const promise = factory().finally(() => inflight.delete(key))
  inflight.set(key, promise)
  return promise
}

function fetchCategories(client: XtreamClient, kind: ContentKind): Promise<Category[]> {
  if (kind === 'live') return client.getLiveCategories()
  if (kind === 'vod') return client.getVodCategories()
  return client.getSeriesCategories()
}

function fetchItems(
  client: XtreamClient,
  kind: ContentKind,
  categoryId?: string
): Promise<unknown[]> {
  if (kind === 'live') return client.getLiveStreams(categoryId)
  if (kind === 'vod') return client.getVodStreams(categoryId)
  return client.getSeries(categoryId)
}

export const useContentStore = create<ContentState>((set, get) => ({
  live: emptySection<LiveStream>(),
  vod: emptySection<VodStream>(),
  series: emptySection<SeriesItem>(),

  reset: () => {
    inflight.clear()
    set({
      live: emptySection<LiveStream>(),
      vod: emptySection<VodStream>(),
      series: emptySection<SeriesItem>()
    })
  },

  loadCategories: (client, kind) =>
    dedupe(`${client.base}:${kind}:categories`, async () => {
      const cached = get()[kind].categories
      if (cached) return cached
      const categories = (await fetchCategories(client, kind)) ?? []
      set((state) => ({ [kind]: { ...state[kind], categories } }) as Partial<ContentState>)
      return categories
    }),

  loadItems: (client, kind, categoryId) =>
    dedupe(`${client.base}:${kind}:cat:${categoryId}`, async () => {
      const cached = get()[kind].itemsByCategory[categoryId]
      if (cached) return cached
      const items = (await fetchItems(client, kind, categoryId)) ?? []
      set(
        (state) =>
          ({
            [kind]: {
              ...state[kind],
              itemsByCategory: { ...state[kind].itemsByCategory, [categoryId]: items }
            }
          }) as Partial<ContentState>
      )
      return items
    }),

  loadAll: (client, kind) =>
    dedupe(`${client.base}:${kind}:all`, async () => {
      const cached = get()[kind].all
      if (cached) return cached
      const all = (await fetchItems(client, kind)) ?? []
      set((state) => ({ [kind]: { ...state[kind], all } }) as Partial<ContentState>)
      return all
    })
}))
