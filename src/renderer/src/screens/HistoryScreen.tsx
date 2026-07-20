import { Play, Trash2 } from 'lucide-react'
import { Poster } from '../components/Poster'
import { usePlayback } from '../hooks/usePlayback'
import { useHistoryStore } from '../stores/history'
import { useServerStore } from '../stores/servers'
import { formatClock, timeAgo } from '../utils/format'

export function HistoryScreen(): JSX.Element {
  const serverId = useServerStore((s) => s.active?.id)
  const entries = useHistoryStore((s) => s.entries)
  const positions = useHistoryStore((s) => s.positions)
  const clear = useHistoryStore((s) => s.clear)
  const { playHistoryEntry } = usePlayback()

  const serverEntries = entries.filter((e) => e.serverId === serverId)

  if (serverEntries.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
        Nothing watched yet on this server.
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => clear()}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
        >
          <Trash2 size={14} />
          Clear history
        </button>
      </div>
      <div className="space-y-1">
        {serverEntries.map((entry) => {
          const saved = positions[entry.key]
          const progress =
            saved && saved.duration > 0 ? Math.min(1, saved.position / saved.duration) : null
          return (
            <button
              key={entry.key}
              onClick={() => playHistoryEntry(entry)}
              className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Poster src={entry.image} alt={entry.name} className="h-12 w-12 shrink-0 rounded-md object-contain" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{entry.name}</p>
                <p className="truncate text-xs text-zinc-500">
                  {entry.subtitle ? `${entry.subtitle} · ` : ''}
                  {entry.type === 'live' ? 'Live TV' : entry.type === 'vod' ? 'Movie' : 'Episode'} ·{' '}
                  {timeAgo(entry.playedAt)}
                  {saved && entry.type !== 'live' ? ` · at ${formatClock(saved.position)}` : ''}
                </p>
                {progress !== null && entry.type !== 'live' && (
                  <div className="mt-1 h-1 w-40 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <div className="h-full bg-indigo-500" style={{ width: `${progress * 100}%` }} />
                  </div>
                )}
              </div>
              <Play size={16} className="shrink-0 text-zinc-400 opacity-0 group-hover:opacity-100" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
