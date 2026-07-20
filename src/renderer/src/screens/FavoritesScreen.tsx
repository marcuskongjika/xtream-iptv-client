import { useMemo } from 'react'
import { ContentGrid } from '../components/ContentGrid'
import { usePlayback } from '../hooks/usePlayback'
import { useDetailStore } from '../stores/detail'
import { useFavoritesStore } from '../stores/favorites'
import { useServerStore } from '../stores/servers'
import type { CardItem, LiveStream, SeriesItem, VodStream } from '../types'
import { liveToCard, seriesToCard, vodToCard } from '../utils/cards'

export function FavoritesScreen(): JSX.Element {
  const serverId = useServerStore((s) => s.active?.id)
  const favorites = useFavoritesStore((s) => s.items)
  const { playLive } = usePlayback()
  const openMovie = useDetailStore((s) => s.openMovie)
  const openSeries = useDetailStore((s) => s.openSeries)

  const cards = useMemo<CardItem[]>(() => {
    return favorites
      .filter((f) => f.serverId === serverId)
      .map((f) => {
        if (f.type === 'live') return liveToCard(f.raw as LiveStream)
        if (f.type === 'vod') return vodToCard(f.raw as VodStream)
        return seriesToCard(f.raw as SeriesItem)
      })
  }, [favorites, serverId])

  const handleItem = (item: CardItem): void => {
    if (item.type === 'live') playLive(item.raw as LiveStream)
    else if (item.type === 'vod') openMovie(item.raw as VodStream)
    else openSeries(item.raw as SeriesItem)
  }

  return (
    <ContentGrid
      items={cards}
      onItem={handleItem}
      emptyMessage="No favorites yet — hover any item and click the heart to add it."
    />
  )
}
