import { Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import { usePlayback } from '../hooks/usePlayback'
import { useDetailStore } from '../stores/detail'
import { useHistoryStore } from '../stores/history'
import { useServerStore } from '../stores/servers'
import type { VodInfo } from '../types'
import { formatClock, formatDuration } from '../utils/format'
import { Modal } from './Modal'
import { Poster } from './Poster'

export function MovieDetailModal(): JSX.Element | null {
  const movie = useDetailStore((s) => s.movie)
  const closeDetail = useDetailStore((s) => s.close)
  const { client, playVod } = usePlayback()
  const active = useServerStore((s) => s.active)
  const getResumePosition = useHistoryStore((s) => s.getResumePosition)

  const [info, setInfo] = useState<VodInfo | null>(null)

  useEffect(() => {
    setInfo(null)
    if (!movie || !client) return
    client
      .getVodInfo(movie.stream_id)
      .then(setInfo)
      .catch(() => setInfo({}))
  }, [movie, client])

  if (!movie) return null

  const details = info?.info
  const resumeAt = active ? getResumePosition(`${active.id}:vod:${movie.stream_id}`) : undefined
  const ext = info?.movie_data?.container_extension || movie.container_extension

  const play = (): void => {
    playVod(movie, ext)
    closeDetail()
  }

  return (
    <Modal title={movie.name} onClose={closeDetail} wide>
      <div className="flex gap-5">
        <Poster
          src={details?.movie_image || details?.cover_big || movie.stream_icon || null}
          alt={movie.name}
          className="h-64 w-44 shrink-0 rounded-lg"
        />
        <div className="min-w-0 flex-1 space-y-3">
          {info === null ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                {details?.genre && <span>{details.genre}</span>}
                {details?.releasedate && <span>{details.releasedate}</span>}
                {details?.duration_secs ? <span>{formatDuration(details.duration_secs)}</span> : null}
                {details?.rating ? <span>★ {details.rating}</span> : null}
              </div>
              {details?.plot && <p className="text-sm leading-relaxed">{details.plot}</p>}
              {details?.cast && (
                <p className="text-xs text-zinc-500">
                  <span className="font-semibold">Cast:</span> {details.cast}
                </p>
              )}
              {details?.director && (
                <p className="text-xs text-zinc-500">
                  <span className="font-semibold">Director:</span> {details.director}
                </p>
              )}
            </>
          )}
          <div className="flex gap-2 pt-2">
            <button
              onClick={play}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              <Play size={16} fill="white" />
              {resumeAt ? `Resume from ${formatClock(resumeAt)}` : 'Play'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
