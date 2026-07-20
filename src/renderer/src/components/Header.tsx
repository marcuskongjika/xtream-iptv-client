import { LayoutGrid, List, RefreshCw, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useContentStore } from '../stores/content'
import { useUIStore } from '../stores/ui'
import type { Section } from '../types'

const titles: Record<Section, string> = {
  live: 'Live TV',
  movies: 'Movies',
  series: 'Series',
  search: 'Search',
  favorites: 'Favorites',
  history: 'Recently Watched',
  settings: 'Settings'
}

export function Header(): JSX.Element {
  const section = useUIStore((s) => s.section)
  const setSection = useUIStore((s) => s.setSection)
  const searchQuery = useUIStore((s) => s.searchQuery)
  const setSearchQuery = useUIStore((s) => s.setSearchQuery)
  const viewMode = useUIStore((s) => s.viewMode)
  const setViewMode = useUIStore((s) => s.setViewMode)
  const resetContent = useContentStore((s) => s.reset)

  const [input, setInput] = useState(searchQuery)

  useEffect(() => setInput(searchQuery), [searchQuery])

  const submitSearch = (): void => {
    const query = input.trim()
    if (!query) return
    setSearchQuery(query)
    setSection('search')
  }

  return (
    <header className="flex items-center gap-4 border-b border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="w-44 shrink-0 truncate text-lg font-bold">{titles[section]}</h1>

      <div className="relative max-w-md flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitSearch()
          }}
          placeholder="Search channels, movies, series…  (Enter)"
          className="w-full rounded-lg border border-zinc-300 bg-zinc-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={() => resetContent()}
          title="Refresh content (clears cache)"
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <RefreshCw size={17} />
        </button>
        <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-700">
          <button
            onClick={() => setViewMode('grid')}
            title="Grid view"
            className={`rounded-l-lg p-2 ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            title="List view"
            className={`rounded-r-lg p-2 ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
