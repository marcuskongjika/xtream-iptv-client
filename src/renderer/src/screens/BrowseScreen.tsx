import { useEffect, useMemo, useState } from 'react'
import { CategoryColumn } from '../components/CategoryColumn'
import { ContentGrid } from '../components/ContentGrid'
import { usePlayback } from '../hooks/usePlayback'
import { useContentStore } from '../stores/content'
import { useDetailStore } from '../stores/detail'
import { toast } from '../stores/toast'
import type { CardItem, ContentKind, LiveStream, SeriesItem, VodStream } from '../types'
import { liveToCard, seriesToCard, vodToCard } from '../utils/cards'

interface BrowseScreenProps {
  kind: ContentKind
}

/** Shared category + grid browser for Live TV, Movies and Series. */
export function BrowseScreen({ kind }: BrowseScreenProps): JSX.Element {
  const { client, playLive } = usePlayback()
  const openMovie = useDetailStore((s) => s.openMovie)
  const openSeries = useDetailStore((s) => s.openSeries)

  const categories = useContentStore((s) => s[kind].categories)
  const itemsByCategory = useContentStore((s) => s[kind].itemsByCategory)
  const loadCategories = useContentStore((s) => s.loadCategories)
  const loadItems = useContentStore((s) => s.loadItems)

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    if (!client || categories) return
    loadCategories(client, kind)
      .then((loaded) => {
        setSelectedCategory((prev) => prev ?? loaded[0]?.category_id ?? null)
      })
      .catch((err) => toast(err instanceof Error ? err.message : 'Failed to load categories', 'error'))
  }, [client, kind, categories, loadCategories])

  useEffect(() => {
    if (!client || !selectedCategory) return
    if (itemsByCategory[selectedCategory]) return
    loadItems(client, kind, selectedCategory).catch((err) =>
      toast(err instanceof Error ? err.message : 'Failed to load content', 'error')
    )
  }, [client, kind, selectedCategory, itemsByCategory, loadItems])

  const cards = useMemo<CardItem[] | null>(() => {
    if (!selectedCategory) return categories ? [] : null
    const items = itemsByCategory[selectedCategory]
    if (!items) return null
    if (kind === 'live') return (items as LiveStream[]).map(liveToCard)
    if (kind === 'vod') return (items as VodStream[]).map(vodToCard)
    return (items as SeriesItem[]).map(seriesToCard)
  }, [kind, categories, itemsByCategory, selectedCategory])

  const handleItem = (item: CardItem): void => {
    if (item.type === 'live') playLive(item.raw as LiveStream)
    else if (item.type === 'vod') openMovie(item.raw as VodStream)
    else openSeries(item.raw as SeriesItem)
  }

  return (
    <div className="flex min-h-0 flex-1">
      <CategoryColumn categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
      <ContentGrid items={cards} onItem={handleItem} />
    </div>
  )
}
