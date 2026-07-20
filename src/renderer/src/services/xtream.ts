import type {
  AuthResponse,
  Category,
  EpgListing,
  LiveStream,
  SeriesInfo,
  SeriesItem,
  ServerProfile,
  VodInfo,
  VodStream
} from '../types'
import { normalizeBaseUrl } from '../utils/format'
import { proxyUrl } from './proxy'

export class XtreamError extends Error {}

const REQUEST_TIMEOUT_MS = 20_000

export class XtreamClient {
  readonly base: string

  constructor(private readonly server: ServerProfile) {
    this.base = normalizeBaseUrl(server.url)
  }

  private apiUrl(params: Record<string, string>): string {
    const url = new URL(`${this.base}/player_api.php`)
    url.searchParams.set('username', this.server.username)
    url.searchParams.set('password', this.server.password)
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
    return url.toString()
  }

  private async get<T>(params: Record<string, string>): Promise<T> {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const response = await fetch(proxyUrl(this.apiUrl(params)), { signal: controller.signal })
      if (!response.ok) {
        throw new XtreamError(`Server responded with HTTP ${response.status}`)
      }
      const text = await response.text()
      try {
        return JSON.parse(text) as T
      } catch {
        throw new XtreamError('Server returned an invalid response (not JSON)')
      }
    } catch (err) {
      if (err instanceof XtreamError) throw err
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new XtreamError('Request timed out — server did not respond')
      }
      throw new XtreamError('Could not reach server — check the URL and your connection')
    } finally {
      window.clearTimeout(timer)
    }
  }

  async authenticate(): Promise<AuthResponse> {
    const result = await this.get<AuthResponse>({})
    if (!result?.user_info || Number(result.user_info.auth) !== 1) {
      throw new XtreamError('Login failed — invalid username or password')
    }
    if (result.user_info.status && result.user_info.status !== 'Active') {
      throw new XtreamError(`Account is not active (status: ${result.user_info.status})`)
    }
    return result
  }

  getLiveCategories(): Promise<Category[]> {
    return this.get({ action: 'get_live_categories' })
  }

  getLiveStreams(categoryId?: string): Promise<LiveStream[]> {
    const params: Record<string, string> = { action: 'get_live_streams' }
    if (categoryId) params.category_id = categoryId
    return this.get(params)
  }

  getVodCategories(): Promise<Category[]> {
    return this.get({ action: 'get_vod_categories' })
  }

  getVodStreams(categoryId?: string): Promise<VodStream[]> {
    const params: Record<string, string> = { action: 'get_vod_streams' }
    if (categoryId) params.category_id = categoryId
    return this.get(params)
  }

  getSeriesCategories(): Promise<Category[]> {
    return this.get({ action: 'get_series_categories' })
  }

  getSeries(categoryId?: string): Promise<SeriesItem[]> {
    const params: Record<string, string> = { action: 'get_series' }
    if (categoryId) params.category_id = categoryId
    return this.get(params)
  }

  getSeriesInfo(seriesId: number): Promise<SeriesInfo> {
    return this.get({ action: 'get_series_info', series_id: String(seriesId) })
  }

  getVodInfo(vodId: number): Promise<VodInfo> {
    return this.get({ action: 'get_vod_info', vod_id: String(vodId) })
  }

  async getShortEpg(streamId: number, limit = 4): Promise<EpgListing[]> {
    const result = await this.get<{ epg_listings?: EpgListing[] }>({
      action: 'get_short_epg',
      stream_id: String(streamId),
      limit: String(limit)
    })
    return result?.epg_listings ?? []
  }

  private credentials(): string {
    return `${encodeURIComponent(this.server.username)}/${encodeURIComponent(this.server.password)}`
  }

  /** Live streams are requested as HLS so hls.js can play them. */
  liveUrl(streamId: number | string): string {
    return proxyUrl(`${this.base}/live/${this.credentials()}/${streamId}.m3u8`)
  }

  vodUrl(streamId: number | string, extension?: string): string {
    return proxyUrl(`${this.base}/movie/${this.credentials()}/${streamId}.${extension || 'mp4'}`)
  }

  episodeUrl(episodeId: number | string, extension?: string): string {
    return proxyUrl(`${this.base}/series/${this.credentials()}/${episodeId}.${extension || 'mp4'}`)
  }
}
