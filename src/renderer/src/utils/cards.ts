import type { CardItem, LiveStream, SeriesItem, VodStream } from '../types'

export function liveToCard(stream: LiveStream): CardItem {
  return {
    key: `live:${stream.stream_id}`,
    id: stream.stream_id,
    type: 'live',
    name: stream.name,
    image: stream.stream_icon || null,
    raw: stream
  }
}

export function vodToCard(stream: VodStream): CardItem {
  const rating = Number(stream.rating_5based)
  return {
    key: `vod:${stream.stream_id}`,
    id: stream.stream_id,
    type: 'vod',
    name: stream.name,
    image: stream.stream_icon || null,
    subtitle: rating > 0 ? `★ ${rating.toFixed(1)}` : undefined,
    raw: stream
  }
}

export function seriesToCard(series: SeriesItem): CardItem {
  const rating = Number(series.rating_5based)
  return {
    key: `series:${series.series_id}`,
    id: series.series_id,
    type: 'series',
    name: series.name,
    image: series.cover || null,
    subtitle: [series.genre, rating > 0 ? `★ ${rating.toFixed(1)}` : ''].filter(Boolean).join(' · ') || undefined,
    raw: series
  }
}
