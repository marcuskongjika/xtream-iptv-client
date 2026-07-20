import { useMemo } from 'react'
import { XtreamClient } from '../services/xtream'
import { useHistoryStore } from '../stores/history'
import { usePlayerStore } from '../stores/player'
import { useServerStore } from '../stores/servers'
import type { Episode, HistoryEntry, LiveStream, SeriesItem, VodStream } from '../types'

/**
 * Central place for turning content objects into playback sessions.
 * Builds stream URLs from the active server and wires up resume positions.
 */
export function usePlayback() {
  const active = useServerStore((s) => s.active)
  const play = usePlayerStore((s) => s.play)
  const getResumePosition = useHistoryStore((s) => s.getResumePosition)

  const client = useMemo(() => (active ? new XtreamClient(active) : null), [active])

  const playLive = (channel: LiveStream): void => {
    if (!client || !active) return
    play({
      key: `${active.id}:live:${channel.stream_id}`,
      serverId: active.id,
      type: 'live',
      id: channel.stream_id,
      title: channel.name,
      url: client.liveUrl(channel.stream_id),
      isLive: true,
      image: channel.stream_icon || null
    })
  }

  const playVod = (movie: VodStream, extension?: string): void => {
    if (!client || !active) return
    const ext = extension || movie.container_extension || 'mp4'
    const key = `${active.id}:vod:${movie.stream_id}`
    play({
      key,
      serverId: active.id,
      type: 'vod',
      id: movie.stream_id,
      title: movie.name,
      url: client.vodUrl(movie.stream_id, ext),
      isLive: false,
      image: movie.stream_icon || null,
      ext,
      resumeFrom: getResumePosition(key)
    })
  }

  const playEpisode = (series: SeriesItem, episode: Episode, season: string): void => {
    if (!client || !active) return
    const ext = episode.container_extension || 'mp4'
    const key = `${active.id}:episode:${episode.id}`
    play({
      key,
      serverId: active.id,
      type: 'episode',
      id: episode.id,
      title: series.name,
      subtitle: `S${season} · E${episode.episode_num}${episode.title ? ` · ${episode.title}` : ''}`,
      url: client.episodeUrl(episode.id, ext),
      isLive: false,
      image: episode.info?.movie_image || series.cover || null,
      ext,
      resumeFrom: getResumePosition(key)
    })
  }

  const playHistoryEntry = (entry: HistoryEntry): void => {
    if (!client || !active || entry.serverId !== active.id) return
    const isLive = entry.type === 'live'
    const url =
      entry.type === 'live'
        ? client.liveUrl(entry.id)
        : entry.type === 'vod'
          ? client.vodUrl(entry.id, entry.ext)
          : client.episodeUrl(entry.id, entry.ext)
    play({
      key: entry.key,
      serverId: entry.serverId,
      type: entry.type,
      id: entry.id,
      title: entry.name,
      subtitle: entry.subtitle,
      url,
      isLive,
      image: entry.image,
      ext: entry.ext,
      resumeFrom: isLive ? undefined : getResumePosition(entry.key)
    })
  }

  return { client, playLive, playVod, playEpisode, playHistoryEntry }
}
