/**
 * Normalize a user-entered server URL: trim whitespace, default to http://
 * when no scheme is given, and strip trailing slashes.
 */
export function normalizeBaseUrl(url: string): string {
  let base = url.trim()
  if (!/^https?:\/\//i.test(base)) base = `http://${base}`
  return base.replace(/\/+$/, '')
}

export function isValidServerUrl(url: string): boolean {
  try {
    const parsed = new URL(normalizeBaseUrl(url))
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/** Format seconds as "1h 23m" / "42m" / "0:35". */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return ''
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return `0:${String(Math.floor(totalSeconds)).padStart(2, '0')}`
}

/** Format seconds as a player clock: "1:02:03" or "12:03". */
export function formatClock(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes)
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Decode a base64 string that may contain UTF-8 text (Xtream EPG fields). */
export function decodeBase64(value: string): string {
  if (!value) return ''
  try {
    const binary = atob(value)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    return value
  }
}

/** Format a unix-seconds timestamp (Xtream `exp_date`, `added`) as a date. */
export function formatEpochDate(epoch: string | number | null | undefined): string {
  if (epoch === null || epoch === undefined || epoch === '') return 'Never'
  const seconds = Number(epoch)
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Unknown'
  return new Date(seconds * 1000).toLocaleDateString()
}

/** Relative "x minutes ago" label for history entries. */
export function timeAgo(timestampMs: number): string {
  const diff = Date.now() - timestampMs
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(timestampMs).toLocaleDateString()
}
