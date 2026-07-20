import Hls, { ErrorData } from 'hls.js'
import {
  Captions,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  PictureInPicture2,
  RotateCcw,
  RotateCw,
  Settings2,
  Volume2,
  VolumeX,
  X
} from 'lucide-react'
import mpegts from 'mpegts.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { XtreamClient } from '../services/xtream'
import { useHistoryStore } from '../stores/history'
import { usePlayerStore } from '../stores/player'
import { useServerStore } from '../stores/servers'
import type { EpgListing, PlayItem } from '../types'
import { decodeBase64, formatClock } from '../utils/format'
import { srtToVtt } from '../utils/subtitles'

const VOLUME_KEY = 'xiptv-volume'
const WATCHDOG_MS = 20_000
const SPEED_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

type VideoFit = 'contain' | 'cover' | 'fill'
const FIT_CLASSES: Record<VideoFit, string> = {
  contain: 'object-contain',
  cover: 'object-cover',
  fill: 'object-fill'
}
const FIT_LABELS: Record<VideoFit, string> = {
  contain: 'Fit (default)',
  cover: 'Zoom to fill',
  fill: 'Stretch'
}

export function Player(): JSX.Element | null {
  const item = usePlayerStore((s) => s.item)
  if (!item) return null
  // Remount the whole player when the stream changes.
  return <PlayerInner key={item.url} item={item} />
}

interface TrackOption {
  id: number
  label: string
}

interface SubtitleOption {
  key: string
  label: string
}

/**
 * Xtream/XUI panels use custom 45x codes to reject the player itself rather
 * than the credentials — translate them into something actionable.
 */
function panelCodeHint(code: number | undefined): string | null {
  if (!code) return null
  if (code === 458) {
    return 'HTTP 458 — the panel rejected this player. Usually the User-Agent is not whitelisted, or your connection limit is already in use. Edit the server and try a different User-Agent, and make sure no other device is streaming with this account.'
  }
  if (code >= 455 && code <= 471) {
    return `HTTP ${code} — the panel refused the connection (provider-specific code: often user-agent block, connection limit, banned IP/country, or expired account). Try another User-Agent in the server settings or ask your provider what ${code} means.`
  }
  return null
}

function describeHlsError(data: ErrorData): string {
  const code = (data.response as { code?: number } | undefined)?.code
  const hint = panelCodeHint(code)
  if (hint) return hint
  const suffix = code ? ` (HTTP ${code})` : ''
  if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
    return `The stream could not be loaded${suffix}`
  }
  if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
    return 'The stream could not be decoded (unsupported codec or corrupted data)'
  }
  return `Playback failed (${data.details})`
}

function PlayerInner({ item }: { item: PlayItem }): JSX.Element {
  const close = usePlayerStore((s) => s.close)
  const savePosition = useHistoryStore((s) => s.savePosition)
  const clearPosition = useHistoryStore((s) => s.clearPosition)
  const active = useServerStore((s) => s.active)

  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const mpegtsRef = useRef<mpegts.Player | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hideTimerRef = useRef<number>()
  const clickTimerRef = useRef<number>()
  const lastSaveRef = useRef(0)
  const pendingExternalRef = useRef(false)

  const [playing, setPlaying] = useState(true)
  const [buffering, setBuffering] = useState(true)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(() => Number(localStorage.getItem(VOLUME_KEY) ?? '1'))
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [levels, setLevels] = useState<TrackOption[]>([])
  const [currentLevel, setCurrentLevel] = useState(-1)
  const [audioTracks, setAudioTracks] = useState<TrackOption[]>([])
  const [currentAudio, setCurrentAudio] = useState(-1)
  const [hlsSubTracks, setHlsSubTracks] = useState<TrackOption[]>([])
  const [activeSubtitle, setActiveSubtitle] = useState('off')
  const [externalSub, setExternalSub] = useState<{ url: string; label: string } | null>(null)
  const [textTrackVersion, setTextTrackVersion] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [videoFit, setVideoFit] = useState<VideoFit>('contain')
  const [epg, setEpg] = useState<EpgListing[]>([])
  // Live streams are tried as HLS (.m3u8) first; if the panel doesn't serve
  // HLS we fall back to the raw MPEG-TS (.ts) stream played through mpegts.js.
  const [tsFallback, setTsFallback] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const canTsFallback = item.isLive && item.url.includes('.m3u8')
  const sourceUrl = tsFallback ? item.url.replace(/\.m3u8(\?.*)?$/, '.ts') : item.url

  const retry = (): void => {
    setError(null)
    setBuffering(true)
    setTsFallback(false)
    setAttempt((n) => n + 1)
  }

  // --- media setup -----------------------------------------------------
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.volume = volume
    setError(null)
    setBuffering(true)

    let destroyed = false
    let networkRetries = 0
    let mediaRecoveries = 0

    const fail = (message: string): void => {
      if (destroyed) return
      if (canTsFallback && !tsFallback) {
        console.warn('[player] HLS failed, falling back to MPEG-TS:', message)
        setTsFallback(true)
      } else {
        setError(message)
      }
    }

    const isHlsUrl = sourceUrl.includes('.m3u8')
    const isTsUrl = /\.ts(\?.*)?$/.test(sourceUrl)

    if (isHlsUrl && Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 30,
        manifestLoadingMaxRetry: 1,
        levelLoadingMaxRetry: 2,
        fragLoadingMaxRetry: 2
      })
      hlsRef.current = hls
      hls.subtitleDisplay = false
      hls.loadSource(sourceUrl)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLevels(
          hls.levels.map((level, index) => ({
            id: index,
            label: level.height ? `${level.height}p` : `${Math.round(level.bitrate / 1000)} kbps`
          }))
        )
        video.play().catch(() => setPlaying(false))
      })
      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => setCurrentLevel(hls.autoLevelEnabled ? -1 : data.level))
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
        setAudioTracks(
          hls.audioTracks.map((track, index) => ({
            id: index,
            label: track.name || track.lang || `Track ${index + 1}`
          }))
        )
        setCurrentAudio(hls.audioTrack)
      })
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
        setHlsSubTracks(
          hls.subtitleTracks.map((track, index) => ({
            id: index,
            label: track.name || track.lang || `Subtitle ${index + 1}`
          }))
        )
      })
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return
        console.error('[player] hls fatal error:', data.details, data.response ?? '')
        const manifestFailure =
          data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
          data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT ||
          data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !manifestFailure && networkRetries < 2) {
          networkRetries++
          hls.startLoad()
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveries < 2) {
          mediaRecoveries++
          hls.recoverMediaError()
        } else {
          fail(describeHlsError(data))
        }
      })
    } else if (isTsUrl && mpegts.isSupported()) {
      const player = mpegts.createPlayer(
        { type: 'mpegts', isLive: true, url: sourceUrl },
        { enableWorker: true, isLive: true, liveBufferLatencyChasing: true, enableStashBuffer: false }
      )
      mpegtsRef.current = player
      player.attachMediaElement(video)
      player.load()
      const playResult = player.play()
      if (playResult) playResult.catch(() => setPlaying(false))
      player.on(
        mpegts.Events.ERROR,
        (errorType: string, errorDetail: string, errorInfo?: { code?: number; msg?: string }) => {
          console.error('[player] mpegts error:', errorType, errorDetail, errorInfo ?? '')
          if (destroyed) return
          const hint = panelCodeHint(errorInfo?.code)
          if (hint) {
            setError(hint)
          } else if (errorType === mpegts.ErrorTypes.MEDIA_ERROR) {
            setError('The stream could not be decoded (unsupported codec)')
          } else {
            const suffix = errorInfo?.code ? ` — HTTP ${errorInfo.code}` : ''
            setError(`The stream could not be loaded (${errorDetail}${suffix})`)
          }
        }
      )
    } else {
      video.src = sourceUrl
      video.play().catch(() => setPlaying(false))
    }

    // Watchdog: never leave the user on an endless spinner.
    const watchdog = window.setTimeout(() => {
      if (destroyed) return
      if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
        console.warn('[player] watchdog: no playable data after', WATCHDOG_MS, 'ms for', sourceUrl)
        fail('The stream did not start — the server may be offline or blocking playback')
      }
    }, WATCHDOG_MS)

    return () => {
      destroyed = true
      window.clearTimeout(watchdog)
      hlsRef.current?.destroy()
      hlsRef.current = null
      if (mpegtsRef.current) {
        mpegtsRef.current.destroy()
        mpegtsRef.current = null
      }
      video.removeAttribute('src')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceUrl, attempt])

  // --- playback speed ---------------------------------------------------
  useEffect(() => {
    const video = videoRef.current
    if (video) video.playbackRate = playbackRate
  }, [playbackRate, attempt])

  const changeSpeed = useCallback(
    (direction: 1 | -1): void => {
      if (item.isLive) return
      setPlaybackRate((rate) => {
        const index = SPEED_STEPS.indexOf(rate)
        const next = SPEED_STEPS[Math.min(Math.max(0, (index === -1 ? 3 : index) + direction), SPEED_STEPS.length - 1)]
        return next
      })
    },
    [item.isLive]
  )

  // --- subtitles --------------------------------------------------------
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const bump = (): void => setTextTrackVersion((v) => v + 1)
    video.textTracks.addEventListener('addtrack', bump)
    video.textTracks.addEventListener('removetrack', bump)
    return () => {
      video.textTracks.removeEventListener('addtrack', bump)
      video.textTracks.removeEventListener('removetrack', bump)
    }
  }, [])

  // Text tracks exposed on the media element. When hls.js is active it mirrors
  // its own subtitle tracks here, so only list the external file to avoid
  // duplicates; native playback lists everything embedded in the container.
  const textTrackOptions = useMemo<SubtitleOption[]>(() => {
    void textTrackVersion
    const video = videoRef.current
    if (!video) return []
    const options: SubtitleOption[] = []
    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i]
      if (track.kind !== 'subtitles' && track.kind !== 'captions') continue
      const label = track.label || track.language || `Subtitle ${i + 1}`
      if (hlsRef.current && label !== externalSub?.label) continue
      options.push({ key: `track:${i}`, label })
    }
    return options
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textTrackVersion, externalSub, attempt])

  const subtitleOptions = useMemo<SubtitleOption[]>(
    () => [
      { key: 'off', label: 'Off' },
      ...textTrackOptions,
      ...hlsSubTracks.map((t) => ({ key: `hls:${t.id}`, label: t.label }))
    ],
    [textTrackOptions, hlsSubTracks]
  )

  const selectSubtitle = useCallback((key: string): void => {
    const video = videoRef.current
    const hls = hlsRef.current
    if (video) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = 'disabled'
      }
    }
    if (hls) {
      hls.subtitleDisplay = false
      hls.subtitleTrack = -1
    }
    if (key.startsWith('track:') && video) {
      const track = video.textTracks[Number(key.slice(6))]
      if (track) track.mode = 'showing'
      setActiveSubtitle(key)
    } else if (key.startsWith('hls:') && hls) {
      hls.subtitleTrack = Number(key.slice(4))
      hls.subtitleDisplay = true
      setActiveSubtitle(key)
    } else {
      setActiveSubtitle('off')
    }
  }, [])

  const cycleSubtitles = useCallback((): void => {
    const keys = subtitleOptions.map((o) => o.key)
    if (keys.length <= 1) return
    const next = keys[(keys.indexOf(activeSubtitle) + 1) % keys.length]
    selectSubtitle(next)
  }, [subtitleOptions, activeSubtitle, selectSubtitle])

  const handleSubtitleFile = async (file: File): Promise<void> => {
    try {
      const text = await file.text()
      const vtt = srtToVtt(text)
      const url = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }))
      setExternalSub((previous) => {
        if (previous) URL.revokeObjectURL(previous.url)
        return { url, label: file.name }
      })
      pendingExternalRef.current = true
    } catch {
      setError(null)
      console.error('[player] failed to read subtitle file')
    }
  }

  // Auto-enable a freshly loaded external subtitle file once its track exists.
  useEffect(() => {
    if (!pendingExternalRef.current || !externalSub) return
    const video = videoRef.current
    if (!video) return
    for (let i = 0; i < video.textTracks.length; i++) {
      if (video.textTracks[i].label === externalSub.label) {
        pendingExternalRef.current = false
        selectSubtitle(`track:${i}`)
        return
      }
    }
  }, [externalSub, textTrackVersion, selectSubtitle])

  useEffect(() => {
    return () => {
      if (externalSub) URL.revokeObjectURL(externalSub.url)
    }
  }, [externalSub])

  // Resume position once metadata is known.
  const handleLoadedMetadata = (): void => {
    const video = videoRef.current
    if (!video) return
    setDuration(video.duration || 0)
    setTextTrackVersion((v) => v + 1)
    if (item.resumeFrom && Number.isFinite(video.duration) && item.resumeFrom < video.duration) {
      video.currentTime = item.resumeFrom
    }
  }

  const handleTimeUpdate = (): void => {
    const video = videoRef.current
    if (!video) return
    setCurrentTime(video.currentTime)
    if (!item.isLive && video.duration > 0) {
      const now = Date.now()
      if (now - lastSaveRef.current > 5000) {
        lastSaveRef.current = now
        savePosition(item.key, video.currentTime, video.duration)
      }
    }
  }

  const handleEnded = (): void => {
    if (!item.isLive) clearPosition(item.key)
    close()
  }

  const handleVideoError = (): void => {
    // Engines (hls.js / mpegts.js) manage the media element themselves and
    // report through their own error events.
    if (hlsRef.current || mpegtsRef.current) return
    const mediaError = videoRef.current?.error
    console.error('[player] media element error:', mediaError?.code, mediaError?.message)
    if (mediaError?.code === MediaError.MEDIA_ERR_DECODE || mediaError?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
      setError(
        `This ${item.ext ? `.${item.ext} ` : ''}stream uses a format this player cannot decode` +
          ' — try a different quality/source if available'
      )
    } else {
      setError('Playback failed — network error or the stream is unavailable')
    }
  }

  // --- EPG for live channels --------------------------------------------
  useEffect(() => {
    if (!item.isLive || !active || typeof item.id !== 'number') return
    const client = new XtreamClient(active)
    client
      .getShortEpg(item.id, 2)
      .then(setEpg)
      .catch(() => undefined)
  }, [item, active])

  // --- controls ---------------------------------------------------------
  const togglePlay = useCallback((): void => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => undefined)
    } else {
      video.pause()
    }
  }, [])

  const seekBy = useCallback(
    (seconds: number): void => {
      const video = videoRef.current
      if (!video || item.isLive) return
      video.currentTime = Math.min(Math.max(0, video.currentTime + seconds), video.duration || Infinity)
    },
    [item.isLive]
  )

  const toggleMute = useCallback((): void => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
  }, [])

  const changeVolume = useCallback((value: number): void => {
    const video = videoRef.current
    if (!video) return
    const clamped = Math.min(1, Math.max(0, value))
    video.volume = clamped
    video.muted = clamped === 0
    setVolume(clamped)
    setMuted(video.muted)
    localStorage.setItem(VOLUME_KEY, String(clamped))
  }, [])

  const adjustVolume = useCallback(
    (delta: number): void => {
      const video = videoRef.current
      if (!video) return
      changeVolume((video.muted ? 0 : video.volume) + delta)
    },
    [changeVolume]
  )

  const toggleFullscreen = useCallback((): void => {
    const container = containerRef.current
    if (!container) return
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined)
    } else {
      container.requestFullscreen().catch(() => undefined)
    }
  }, [])

  const togglePip = (): void => {
    const video = videoRef.current
    if (!video) return
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => undefined)
    } else {
      video.requestPictureInPicture().catch(() => undefined)
    }
  }

  useEffect(() => {
    const onFullscreenChange = (): void => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement) return
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
        case 'j':
          seekBy(-10)
          break
        case 'ArrowRight':
        case 'l':
          seekBy(10)
          break
        case 'ArrowUp':
          e.preventDefault()
          adjustVolume(0.05)
          break
        case 'ArrowDown':
          e.preventDefault()
          adjustVolume(-0.05)
          break
        case 'f':
          toggleFullscreen()
          break
        case 'm':
          toggleMute()
          break
        case 'c':
          cycleSubtitles()
          break
        case '[':
          changeSpeed(-1)
          break
        case ']':
          changeSpeed(1)
          break
        case 'Escape':
          if (!document.fullscreenElement) close()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay, seekBy, adjustVolume, toggleFullscreen, toggleMute, cycleSubtitles, changeSpeed, close])

  // Auto-hide controls.
  const showControls = (): void => {
    setControlsVisible(true)
    window.clearTimeout(hideTimerRef.current)
    hideTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false)
      setMenuOpen(false)
    }, 3000)
  }

  useEffect(() => {
    showControls()
    return () => {
      window.clearTimeout(hideTimerRef.current)
      window.clearTimeout(clickTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Single click toggles play/pause, but with a short delay so a double-click
  // (fullscreen toggle) can cancel it and not flicker pause/play.
  const handleVideoClick = (): void => {
    window.clearTimeout(clickTimerRef.current)
    clickTimerRef.current = window.setTimeout(() => togglePlay(), 250)
  }

  const handleVideoDoubleClick = (): void => {
    window.clearTimeout(clickTimerRef.current)
    toggleFullscreen()
  }

  const selectLevel = (id: number): void => {
    const hls = hlsRef.current
    if (!hls) return
    hls.currentLevel = id
    setCurrentLevel(id)
  }

  const selectAudio = (id: number): void => {
    const hls = hlsRef.current
    if (!hls) return
    hls.audioTrack = id
    setCurrentAudio(id)
  }

  const nowPlaying = useMemo(() => {
    const listing = epg[0]
    if (!listing) return null
    return decodeBase64(listing.title)
  }, [epg])

  const progress = duration > 0 ? currentTime / duration : 0

  const menuItemClass = (selected: boolean): string =>
    `block w-full rounded px-2 py-1 text-left hover:bg-white/10 ${selected ? 'text-indigo-400' : ''}`

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-black"
      onMouseMove={showControls}
      onClick={showControls}
    >
      <video
        ref={videoRef}
        className={`h-full w-full ${FIT_CLASSES[videoFit]}`}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onCanPlay={() => setBuffering(false)}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleVideoError}
        onClick={handleVideoClick}
        onDoubleClick={handleVideoDoubleClick}
      >
        {externalSub && (
          <track kind="subtitles" src={externalSub.url} label={externalSub.label} srcLang="und" />
        )}
      </video>

      <input
        ref={fileInputRef}
        type="file"
        accept=".srt,.vtt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleSubtitleFile(file)
          e.target.value = ''
        }}
      />

      {/* Click-away layer for the settings menu: closes it without pausing. */}
      {menuOpen && (
        <div
          className="absolute inset-0 z-10"
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen(false)
          }}
          onDoubleClick={(e) => e.stopPropagation()}
        />
      )}

      {buffering && !error && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
          <Loader2 size={48} className="animate-spin text-white/80" />
          {tsFallback && <p className="text-sm text-white/60">Retrying with MPEG-TS stream…</p>}
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 px-8 text-center text-white">
          <p className="text-lg">{error}</p>
          <p className="text-xs text-white/50">Press F12 to open DevTools for technical details.</p>
          <div className="flex gap-2">
            <button
              onClick={retry}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500"
            >
              Retry
            </button>
            <button
              onClick={close}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
            >
              Close player
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div
        className={`absolute inset-x-0 top-0 z-20 flex items-start justify-between bg-gradient-to-b from-black/80 to-transparent p-4 transition-opacity ${controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <div className="min-w-0 pr-4">
          <div className="flex items-center gap-2">
            {item.isLive && (
              <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                Live
              </span>
            )}
            <h2 className="truncate text-lg font-semibold text-white">{item.title}</h2>
            {!item.isLive && playbackRate !== 1 && (
              <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {playbackRate}×
              </span>
            )}
          </div>
          {item.subtitle && <p className="truncate text-sm text-white/70">{item.subtitle}</p>}
          {nowPlaying && <p className="truncate text-sm text-white/70">Now: {nowPlaying}</p>}
        </div>
        <button
          onClick={close}
          className="rounded-full bg-black/50 p-2 text-white hover:bg-black/80"
          aria-label="Close player"
        >
          <X size={20} />
        </button>
      </div>

      {/* Bottom controls */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 space-y-2 bg-gradient-to-t from-black/90 to-transparent p-4 transition-opacity ${controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        {!item.isLive && duration > 0 && (
          <div className="flex items-center gap-3 text-xs text-white/90">
            <span className="w-14 text-right tabular-nums">{formatClock(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={progress}
              onChange={(e) => {
                const video = videoRef.current
                if (video) video.currentTime = Number(e.target.value) * duration
              }}
              className="flex-1"
            />
            <span className="w-14 tabular-nums">{formatClock(duration)}</span>
          </div>
        )}

        <div className="flex items-center gap-3 text-white">
          <button onClick={togglePlay} className="rounded-full p-1.5 hover:bg-white/15" title="Play/Pause (Space)">
            {playing ? <Pause size={22} /> : <Play size={22} />}
          </button>
          {!item.isLive && (
            <>
              <button onClick={() => seekBy(-10)} className="rounded-full p-1.5 hover:bg-white/15" title="Back 10s (←)">
                <RotateCcw size={18} />
              </button>
              <button onClick={() => seekBy(10)} className="rounded-full p-1.5 hover:bg-white/15" title="Forward 10s (→)">
                <RotateCw size={18} />
              </button>
            </>
          )}
          <button onClick={toggleMute} className="rounded-full p-1.5 hover:bg-white/15" title="Mute (M)">
            {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            className="w-24"
          />

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={cycleSubtitles}
              className={`rounded-full p-1.5 hover:bg-white/15 ${activeSubtitle !== 'off' ? 'text-indigo-400' : ''}`}
              title="Cycle subtitles (C)"
            >
              <Captions size={20} />
            </button>
            <div className="relative">
              <button
                onClick={() => setMenuOpen((open) => !open)}
                className="rounded-full p-1.5 hover:bg-white/15"
                title="Playback settings"
              >
                <Settings2 size={20} />
              </button>
              {menuOpen && (
                <div className="absolute bottom-10 right-0 max-h-80 w-52 overflow-y-auto rounded-lg bg-zinc-900/95 p-2 text-xs shadow-xl">
                  {!item.isLive && (
                    <div className="mb-2">
                      <p className="mb-1 px-1 font-semibold text-white/60">Speed ( [ / ] )</p>
                      <div className="grid grid-cols-4 gap-1">
                        {SPEED_STEPS.map((rate) => (
                          <button
                            key={rate}
                            onClick={() => setPlaybackRate(rate)}
                            className={`rounded px-1 py-1 text-center hover:bg-white/10 ${playbackRate === rate ? 'bg-indigo-600 text-white' : ''}`}
                          >
                            {rate}×
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-2">
                    <p className="mb-1 px-1 font-semibold text-white/60">Subtitles (C)</p>
                    {subtitleOptions.map((option) => (
                      <button
                        key={option.key}
                        onClick={() => selectSubtitle(option.key)}
                        className={menuItemClass(activeSubtitle === option.key)}
                      >
                        {option.label}
                      </button>
                    ))}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-1 block w-full rounded border border-white/20 px-2 py-1 text-left text-white/80 hover:bg-white/10"
                    >
                      Load subtitle file… (.srt/.vtt)
                    </button>
                  </div>

                  <div className="mb-2">
                    <p className="mb-1 px-1 font-semibold text-white/60">Video fit</p>
                    {(Object.keys(FIT_LABELS) as VideoFit[]).map((fit) => (
                      <button
                        key={fit}
                        onClick={() => setVideoFit(fit)}
                        className={menuItemClass(videoFit === fit)}
                      >
                        {FIT_LABELS[fit]}
                      </button>
                    ))}
                  </div>

                  {levels.length > 1 && (
                    <div className="mb-2">
                      <p className="mb-1 px-1 font-semibold text-white/60">Quality</p>
                      <button onClick={() => selectLevel(-1)} className={menuItemClass(currentLevel === -1)}>
                        Auto
                      </button>
                      {levels.map((level) => (
                        <button
                          key={level.id}
                          onClick={() => selectLevel(level.id)}
                          className={menuItemClass(currentLevel === level.id)}
                        >
                          {level.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {audioTracks.length > 1 && (
                    <div>
                      <p className="mb-1 px-1 font-semibold text-white/60">Audio</p>
                      {audioTracks.map((track) => (
                        <button
                          key={track.id}
                          onClick={() => selectAudio(track.id)}
                          className={menuItemClass(currentAudio === track.id)}
                        >
                          {track.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button onClick={togglePip} className="rounded-full p-1.5 hover:bg-white/15" title="Picture in picture">
              <PictureInPicture2 size={20} />
            </button>
            <button onClick={toggleFullscreen} className="rounded-full p-1.5 hover:bg-white/15" title="Fullscreen (F)">
              {fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
