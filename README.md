# Xtream IPTV Client

A desktop IPTV streaming client for **Xtream Codes** servers, built with Electron, React, and TypeScript.

> **Note:** This is a player only — it ships with no content. You must have your own valid credentials for an Xtream Codes server, and you are responsible for ensuring you are authorized to access any content you stream with it.

## Features

- **Server profiles** — add, edit, delete and quick-switch between multiple Xtream Codes servers; auto-reconnects to the last server on launch
- **Secure credential storage** — passwords are encrypted at rest with the OS keychain via Electron `safeStorage`
- **Live TV, Movies & Series** browsing organized by category, with category filtering
- **Search** across all three content types
- **Favorites** and **recently watched** history with resume-from-position for movies and episodes
- **Integrated player** — HLS live streams via hls.js with automatic MPEG-TS (mpegts.js) fallback, direct playback for VOD; play/pause, seek, volume, fullscreen, picture-in-picture, quality and audio-track selection, now-playing EPG for live channels
- **Subtitles** — embedded subtitle/caption tracks (HLS and container), plus external `.srt`/`.vtt` file loading with automatic SRT→VTT conversion
- **Playback speed** (0.25×–2×) for movies/episodes and **video fit** modes (fit / zoom / stretch)
- **Local stream proxy** — all IPTV traffic goes through a Node-based proxy in the main process: per-server User-Agent, lenient TLS for legacy panels, redirect handling, HLS playlist rewriting, no CORS/HSTS issues
- **Keyboard shortcuts** — `Space`/`K` play/pause, `←`/`→` or `J`/`L` seek ±10s, `↑`/`↓` volume, `F` fullscreen, `M` mute, `C` cycle subtitles, `[`/`]` speed down/up, `Esc` close player; click video to pause, double-click for fullscreen
- **Grid / list views**, dark / light theme, lazy image loading, incremental rendering for large playlists
- **Content caching** with manual refresh, request de-duplication and timeouts

## Tech stack

| Concern | Choice |
| --- | --- |
| Shell | Electron 33 + electron-vite |
| UI | React 18 + TypeScript (strict) |
| State | Zustand (with `persist` for prefs/favorites/history) |
| Styling | Tailwind CSS |
| Playback | hls.js + native HTML5 video |
| Tests | Vitest |
| Packaging | electron-builder |

## Getting started

```bash
npm install
npm run dev        # start in development with HMR
```

Other scripts:

```bash
npm run typecheck  # strict TypeScript check (main + renderer)
npm test           # unit tests (Vitest)
npm run build      # production build to out/
npm run dist:win   # build Windows installer (also dist:mac / dist:linux)
```

On first launch, add a server: display name, server URL (e.g. `http://example.com:8080`), username, and password. Connect and browse.

## Architecture notes

```
src/
├── main/           Electron main process
│   ├── index.ts    window creation, CORS header injection, IPC handlers
│   └── serverStore.ts  encrypted server-profile persistence (safeStorage)
├── preload/        context-isolated bridge exposing the servers API
├── shared/         types shared between main and renderer
└── renderer/src/
    ├── services/xtream.ts   Xtream Codes API client + stream URL builders
    ├── stores/              Zustand stores (servers, content cache, ui, player, favorites, history, toasts)
    ├── hooks/usePlayback.ts content → playback session wiring (URLs, resume)
    ├── components/          Sidebar, Header, ContentGrid, Player, modals…
    └── screens/             Browse (live/movies/series), Search, Favorites, History, Settings, Setup
```

- **CORS**: Xtream panels don't send CORS headers. Instead of disabling `webSecurity`, the main process injects `Access-Control-Allow-*` headers into responses via `webRequest.onHeadersReceived`, keeping context isolation and web security intact.
- **Live streams** are requested as `.m3u8` (HLS) and played through hls.js with automatic recovery on network/media errors. VOD/series play through the native video element (mp4/mkv depending on Chromium codec support).
- **Credentials** never leave the machine; they are stored encrypted in `userData/servers.json` and only decrypted in the main process.

## Known limitations / next steps

- External subtitle files, EPG timeline grid, catch-up/time-shift recording and M3U import are not implemented yet.
- Some VOD containers (e.g. certain `.mkv`/`.avi` codecs) may not be decodable by Chromium; a future improvement is falling back to an external player or bundling ffmpeg-based playback.
- Auto-update wiring (electron-updater) and code signing are left to the release pipeline.
