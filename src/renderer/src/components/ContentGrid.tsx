import { Heart, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useFavoritesStore } from '../stores/favorites'
import { useServerStore } from '../stores/servers'
import { useUIStore } from '../stores/ui'
import type { CardItem } from '../types'
import { Poster } from './Poster'

const PAGE_SIZE = 60

interface ContentGridProps {
  items: CardItem[] | null
  onItem: (item: CardItem) => void
  emptyMessage?: string
  /** Render without its own scroll container (for use inside a scrolling parent). */
  embedded?: boolean
}

export function ContentGrid({
  items,
  onItem,
  emptyMessage = 'No content in this category',
  embedded = false
}: ContentGridProps): JSX.Element {
  const viewMode = useUIStore((s) => s.viewMode)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => setVisibleCount(PAGE_SIZE), [items])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setVisibleCount((count) => count + PAGE_SIZE)
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [items, visibleCount])

  if (items === null) {
    return (
      <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 overflow-y-auto p-4">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
        {emptyMessage}
      </div>
    )
  }

  const visible = items.slice(0, visibleCount)
  const containerClass = embedded ? '' : 'flex-1 overflow-y-auto'

  if (viewMode === 'list') {
    return (
      <div className={`${containerClass} p-3`}>
        <div className="space-y-1">
          {visible.map((item) => (
            <ListRow key={item.key} item={item} onClick={() => onItem(item)} />
          ))}
        </div>
        {visibleCount < items.length && <div ref={sentinelRef} className="h-8" />}
      </div>
    )
  }

  return (
    <div className={`${containerClass} p-4`}>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
        {visible.map((item) => (
          <GridCard key={item.key} item={item} onClick={() => onItem(item)} />
        ))}
      </div>
      {visibleCount < items.length && <div ref={sentinelRef} className="h-8" />}
    </div>
  )
}

function FavoriteButton({ item, className = '' }: { item: CardItem; className?: string }): JSX.Element {
  const serverId = useServerStore((s) => s.active?.id) ?? ''
  const favKey = `${serverId}:${item.type}:${item.id}`
  const isFavorite = useFavoritesStore((s) => s.items.some((f) => f.key === favKey))
  const toggle = useFavoritesStore((s) => s.toggle)

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        toggle({
          key: favKey,
          serverId,
          type: item.type,
          id: item.id,
          name: item.name,
          image: item.image,
          raw: item.raw
        })
      }}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      className={`${className} ${isFavorite ? 'text-red-500' : 'text-white/80 hover:text-white'}`}
    >
      <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
    </button>
  )
}

function GridCard({ item, onClick }: { item: CardItem; onClick: () => void }): JSX.Element {
  const isLive = item.type === 'live'
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-lg bg-zinc-200 text-left shadow-sm transition-transform hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800"
    >
      <Poster
        src={item.image}
        alt={item.name}
        className={`w-full ${isLive ? 'aspect-square p-4' : 'aspect-[2/3]'} ${isLive ? 'object-contain' : ''}`}
      />
      <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/85 via-transparent to-black/30 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="flex justify-end p-2">
          <FavoriteButton item={item} className="rounded-full bg-black/40 p-1.5" />
        </div>
        <div className="flex items-center justify-center">
          <Play size={36} className="text-white drop-shadow" fill="white" />
        </div>
        <div className="p-2" />
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-medium" title={item.name}>
          {item.name}
        </p>
        {item.subtitle && <p className="truncate text-[11px] text-zinc-500">{item.subtitle}</p>}
      </div>
    </button>
  )
}

function ListRow({ item, onClick }: { item: CardItem; onClick: () => void }): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      <Poster src={item.image} alt={item.name} className="h-10 w-10 shrink-0 rounded-md object-contain text-sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.name}</p>
        {item.subtitle && <p className="truncate text-xs text-zinc-500">{item.subtitle}</p>}
      </div>
      <FavoriteButton item={item} className="!text-zinc-400 hover:!text-red-500" />
      <Play size={16} className="text-zinc-400 opacity-0 group-hover:opacity-100" />
    </button>
  )
}
