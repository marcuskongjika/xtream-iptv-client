import {
  Clapperboard,
  Film,
  Heart,
  History,
  Moon,
  Search,
  Server,
  Settings,
  Sun,
  Tv
} from 'lucide-react'
import { useServerStore } from '../stores/servers'
import { useUIStore } from '../stores/ui'
import type { Section } from '../types'

const navItems: Array<{ section: Section; label: string; icon: JSX.Element }> = [
  { section: 'live', label: 'Live TV', icon: <Tv size={18} /> },
  { section: 'movies', label: 'Movies', icon: <Film size={18} /> },
  { section: 'series', label: 'Series', icon: <Clapperboard size={18} /> },
  { section: 'search', label: 'Search', icon: <Search size={18} /> },
  { section: 'favorites', label: 'Favorites', icon: <Heart size={18} /> },
  { section: 'history', label: 'History', icon: <History size={18} /> }
]

export function Sidebar(): JSX.Element {
  const section = useUIStore((s) => s.section)
  const setSection = useUIStore((s) => s.setSection)
  const theme = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const active = useServerStore((s) => s.active)
  const status = useServerStore((s) => s.status)

  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <Tv size={16} />
        </div>
        <span className="text-sm font-bold leading-tight">
          Xtream
          <br />
          IPTV Client
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {navItems.map((item) => (
          <button
            key={item.section}
            onClick={() => setSection(item.section)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              section === item.section
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div className="space-y-1 border-t border-zinc-200 p-2 dark:border-zinc-800">
        <button
          onClick={() => setSection('settings')}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
            section === 'settings'
              ? 'bg-indigo-600 text-white'
              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
          }`}
        >
          <Settings size={18} />
          Settings
        </button>
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
          <Server size={14} />
          <span className="truncate">{active?.name ?? 'Not connected'}</span>
          <span
            className={`ml-auto h-2 w-2 shrink-0 rounded-full ${
              status === 'connected'
                ? 'bg-emerald-500'
                : status === 'connecting'
                  ? 'animate-pulse bg-amber-500'
                  : 'bg-zinc-400'
            }`}
          />
        </div>
      </div>
    </aside>
  )
}
