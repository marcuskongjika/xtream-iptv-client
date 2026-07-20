import { Play } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { usePlayback } from '../hooks/usePlayback'
import { useDetailStore } from '../stores/detail'
import type { SeriesInfo } from '../types'
import { Modal } from './Modal'
import { Poster } from './Poster'

export function SeriesDetailModal(): JSX.Element | null {
  const series = useDetailStore((s) => s.series)
  const closeDetail = useDetailStore((s) => s.close)
  const { client, playEpisode } = usePlayback()

  const [info, setInfo] = useState<SeriesInfo | null>(null)
  const [season, setSeason] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setInfo(null)
    setSeason(null)
    setFailed(false)
    if (!series || !client) return
    client
      .getSeriesInfo(series.series_id)
      .then((result) => {
        setInfo(result)
        const seasons = Object.keys(result.episodes ?? {})
        setSeason(seasons[0] ?? null)
      })
      .catch(() => setFailed(true))
  }, [series, client])

  const seasons = useMemo(() => Object.keys(info?.episodes ?? {}), [info])
  const episodes = season ? (info?.episodes?.[season] ?? []) : []

  if (!series) return null

  return (
    <Modal title={series.name} onClose={closeDetail} wide>
      <div className="flex gap-5">
        <Poster src={series.cover || null} alt={series.name} className="h-64 w-44 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
            {series.genre && <span>{series.genre}</span>}
            {series.releaseDate && <span>{series.releaseDate}</span>}
            {Number(series.rating_5based) > 0 && <span>★ {Number(series.rating_5based).toFixed(1)}</span>}
          </div>
          {series.plot && <p className="line-clamp-4 text-sm leading-relaxed">{series.plot}</p>}

          {failed && <p className="text-sm text-red-500">Failed to load episode list.</p>}

          {info === null && !failed && (
            <div className="space-y-2 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-9 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              ))}
            </div>
          )}

          {seasons.length > 0 && (
            <>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {seasons.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSeason(s)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      season === s
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                  >
                    Season {s}
                  </button>
                ))}
              </div>
              <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                {episodes.map((episode) => (
                  <button
                    key={episode.id}
                    onClick={() => {
                      if (season) {
                        playEpisode(series, episode, season)
                        closeDetail()
                      }
                    }}
                    className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <span className="w-8 shrink-0 text-xs font-semibold text-zinc-400">
                      E{episode.episode_num}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {episode.title || `Episode ${episode.episode_num}`}
                    </span>
                    {episode.info?.duration && (
                      <span className="shrink-0 text-xs text-zinc-500">{episode.info.duration}</span>
                    )}
                    <Play size={14} className="shrink-0 text-zinc-400 opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
