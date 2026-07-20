export type { ServerProfile, ServerInput } from '../../../shared/types'

export type Section = 'live' | 'movies' | 'series' | 'search' | 'favorites' | 'history' | 'settings'
export type ContentKind = 'live' | 'vod' | 'series'
export type ViewMode = 'grid' | 'list'
export type Theme = 'light' | 'dark'

export interface XtreamUserInfo {
  username: string
  password?: string
  message?: string
  auth: number
  status: string
  exp_date: string | null
  is_trial: string
  active_cons: string | number
  created_at: string
  max_connections: string | number
}

export interface XtreamServerInfo {
  url: string
  port: string
  https_port?: string
  server_protocol: string
  timezone?: string
  time_now?: string
}

export interface AuthResponse {
  user_info?: XtreamUserInfo
  server_info?: XtreamServerInfo
}

export interface Category {
  category_id: string
  category_name: string
  parent_id: number
}

export interface LiveStream {
  num: number
  name: string
  stream_type: string
  stream_id: number
  stream_icon: string
  epg_channel_id: string | null
  added: string
  category_id: string
  tv_archive: number
}

export interface VodStream {
  num: number
  name: string
  stream_type: string
  stream_id: number
  stream_icon: string
  rating: string | number
  rating_5based: number
  added: string
  category_id: string
  container_extension: string
}

export interface SeriesItem {
  num: number
  name: string
  series_id: number
  cover: string
  plot: string
  cast: string
  director: string
  genre: string
  releaseDate: string
  rating: string | number
  rating_5based: number
  category_id: string
}

export interface Episode {
  id: string
  episode_num: number | string
  title: string
  container_extension: string
  season: number
  info?: {
    duration?: string
    duration_secs?: number
    plot?: string
    movie_image?: string
    rating?: string | number
  }
}

export interface SeriesInfo {
  info?: Partial<SeriesItem> & { youtube_trailer?: string }
  episodes?: Record<string, Episode[]>
}

export interface VodInfo {
  info?: {
    name?: string
    o_name?: string
    movie_image?: string
    cover_big?: string
    plot?: string
    cast?: string
    director?: string
    genre?: string
    releasedate?: string
    duration_secs?: number
    duration?: string
    rating?: string | number
  }
  movie_data?: {
    stream_id: number
    name: string
    container_extension: string
    category_id: string
  }
}

export interface EpgListing {
  id: string
  title: string
  description: string
  start: string
  end: string
  start_timestamp: string | number
  stop_timestamp: string | number
}

export interface CardItem {
  key: string
  id: number
  type: ContentKind
  name: string
  image: string | null
  subtitle?: string
  raw: LiveStream | VodStream | SeriesItem
}

export interface PlayItem {
  key: string
  serverId: string
  type: 'live' | 'vod' | 'episode'
  id: number | string
  title: string
  subtitle?: string
  url: string
  isLive: boolean
  image: string | null
  ext?: string
  resumeFrom?: number
}

export interface HistoryEntry {
  key: string
  serverId: string
  type: 'live' | 'vod' | 'episode'
  id: number | string
  name: string
  subtitle?: string
  image: string | null
  ext?: string
  playedAt: number
}

export interface FavoriteItem {
  key: string
  serverId: string
  type: ContentKind
  id: number
  name: string
  image: string | null
  raw: LiveStream | VodStream | SeriesItem
}
