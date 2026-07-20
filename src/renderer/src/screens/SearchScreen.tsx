import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ContentGrid } from '../components/ContentGrid'
import { usePlayback } from '../hooks/usePlayback'
import { useContentStore } from '../stores/content'
import { useDetailStore } from '../stores/detail'
import { toast } from '../stores/toast'
import { useUIStore } from '../stores/ui'
import type { CardItem, LiveStream, SeriesItem, VodStream } from '../types'
import { liveToCard, seriesToCard, vodToCard } from '../utils/cards'

const MAX_PER_GROUP = 60

export function SearchScreen(): JSX.Element {
  const query = useUIStore((s) => s.searchQuery)
  const { client, playLive } = usePlayback()
  const openMovie = useDetailStore((s) => s.openMovie)
  const openSeries = useDetailStore((s) => s.openSeries)

  const live = useContentStore((s) => s.live.all)
  const vod = useContentStore((s) => s.vod.all)
  const series = useContentStore((s) => s.series.all)
  const loadAll = useContentStore((s) => s.loadAll)

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!client || !query) return
    if (live && vod && series) return
    setLoading(true)
    Promise.allSettled([
      loadAll(client, 'live'),
      loadAll(client, 'vod'),
      loadAll(client, 'series')
    ]).then((results) => {
      setLoading(false)
      if (results.some((r) => r.status === 'rejected')) {
        toast('Some content lists could not be loaded', 'error')
      }
    })
  }, [client, query, live, vod, series, loadAll])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return { live: [], vod: [], series: [] }
    const match = (name: string): boolean => name.toLowerCase().includes(q)
    return {
      live: ((live as LiveStream[]) ?? []).filter((s) => match(s.name)).slice(0, MAX_PER_GROUP).map(liveToCard),
      vod: ((vod as VodStream[]) ?? []).filter((s) => match(s.name)).slice(0, MAX_PER_GROUP).map(vodToCard),
      series: ((series as SeriesItem[]) ?? []).filter((s) => match(s.name)).slice(0, MAX_PER_GROUP).map(seriesToCard)
    }
  }, [query, live, vod, series])

  const handleItem = (item: CardItem): void => {
    if (item.type === 'live') playLive(item.raw as LiveStream)
    else if (item.type === 'vod') openMovie(item.raw as VodStream)
    else openSeries(item.raw as SeriesItem)
  }

  if (!query) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
        Type a search above and press Enter.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-zinc-500">
        <Loader2 size={28} className="animate-spin" />
        Indexing content for search — this can take a moment on large playlists…
      </div>
    )
  }

  const total = results.live.length + results.vod.length + results.series.length

  return (
    <div className="flex-1 overflow-y-auto">
      <p className="px-5 pt-4 text-sm text-zinc-500">
        {total === 0 ? `No results for “${query}”` : `Results for “${query}”`}
      </p>
      {results.live.length > 0 && <Group title={`Live TV (${results.live.length})`} items={results.live} onItem={handleItem} />}
      {results.vod.length > 0 && <Group title={`Movies (${results.vod.length})`} items={results.vod} onItem={handleItem} />}
      {results.series.length > 0 && <Group title={`Series (${results.series.length})`} items={results.series} onItem={handleItem} />}
    </div>
  )
}

function Group({
  title,
  items,
  onItem
}: {
  title: string
  items: CardItem[]
  onItem: (item: CardItem) => void
}): JSX.Element {
  return (
    <section>
      <h2 className="px-5 pt-4 text-sm font-bold uppercase tracking-wide text-zinc-500">{title}</h2>
      <ContentGrid items={items} onItem={onItem} embedded />
    </section>
  )
}
