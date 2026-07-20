/** Types shared between the Electron main process and the renderer. */

/**
 * Default User-Agent for streaming requests. Many Xtream panels whitelist
 * known players and reject browsers/unknown agents with custom 45x codes,
 * so we identify as VLC unless the server profile overrides it.
 */
export const DEFAULT_STREAM_USER_AGENT = 'VLC/3.0.20 LibVLC/3.0.20'

export interface ServerProfile {
  id: string
  name: string
  url: string
  username: string
  password: string
  userAgent?: string
  createdAt: string
  lastConnected: string | null
}

export interface ServerInput {
  id?: string
  name: string
  url: string
  username: string
  password: string
  userAgent?: string
}
