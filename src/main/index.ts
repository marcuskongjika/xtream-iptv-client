import { app, shell, BrowserWindow, ipcMain, session } from 'electron'
import { join } from 'path'
import { listServers, saveServer, deleteServer, touchServer } from './serverStore'
import { getProxyPort, startStreamProxy } from './streamProxy'
import { DEFAULT_STREAM_USER_AGENT, type ServerInput } from '../shared/types'

/** User-Agent presented to IPTV servers; set per active server via IPC. */
let streamUserAgent: string = DEFAULT_STREAM_USER_AGENT

// Many IPTV panels run ancient TLS stacks (TLS 1.0/1.1) that Chromium
// disables by default, producing ERR_SSL_VERSION_OR_CIPHER_MISMATCH (-113).
app.commandLine.appendSwitch('ssl-version-min', 'tls1')

// IPTV panels and their stream redirect hosts almost never have valid
// certificates (self-signed/expired/wrong host). This is a dedicated IPTV
// client, so accept them — the trade-off is deliberate and logged.
app.on('certificate-error', (event, _webContents, url, error, _certificate, callback) => {
  console.warn('[main] ignoring certificate error for', url, '-', error)
  event.preventDefault()
  callback(true)
})

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 620,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#09090b',
    title: 'Xtream IPTV Client',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      win.webContents.toggleDevTools()
    }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/**
 * Xtream Codes panels do not send CORS headers, which would block fetch/hls.js
 * requests from the renderer. Inject permissive CORS headers on all responses
 * so the renderer can talk to any user-configured server without disabling
 * webSecurity entirely.
 */
function setupCorsBypass(): void {
  // Some IPTV panels reject or silently hang on requests that carry a browser
  // Origin/Referer or a non-browser user agent. Present a plain Chrome UA and
  // strip those headers from outgoing requests to streaming servers.
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const requestHeaders = { ...details.requestHeaders }
    let isLocal = false
    try {
      const host = new URL(details.url).hostname
      isLocal = host === 'localhost' || host === '127.0.0.1'
    } catch {
      // keep headers as-is for unparseable URLs
    }
    if (!isLocal) {
      for (const key of Object.keys(requestHeaders)) {
        if (/^(origin|referer|user-agent)$/i.test(key)) delete requestHeaders[key]
      }
      requestHeaders['User-Agent'] = streamUserAgent
    }
    callback({ requestHeaders })
  })

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders }
    for (const key of Object.keys(responseHeaders)) {
      if (/^access-control-allow-/i.test(key)) delete responseHeaders[key]
    }
    responseHeaders['Access-Control-Allow-Origin'] = ['*']
    responseHeaders['Access-Control-Allow-Headers'] = ['*']
    responseHeaders['Access-Control-Allow-Methods'] = ['GET, POST, OPTIONS']
    callback({ responseHeaders })
  })
}

app.whenReady().then(async () => {
  await startStreamProxy(() => streamUserAgent)

  // Drop the app-name and Electron tokens from the user agent — some providers
  // only serve streams to what looks like a regular Chrome browser.
  app.userAgentFallback = app.userAgentFallback
    .split(' ')
    .filter((part) => !/^(xtream-iptv-client|Electron)\//i.test(part))
    .join(' ')

  setupCorsBypass()

  ipcMain.handle('servers:list', () => listServers())
  ipcMain.handle('servers:save', (_event, input: ServerInput) => saveServer(input))
  ipcMain.handle('servers:delete', (_event, id: string) => deleteServer(id))
  ipcMain.handle('servers:touch', (_event, id: string) => touchServer(id))
  ipcMain.handle('app:version', () => app.getVersion())
  ipcMain.handle('network:set-user-agent', (_event, userAgent: string | null) => {
    streamUserAgent = userAgent?.trim() || DEFAULT_STREAM_USER_AGENT
  })
  ipcMain.handle('proxy:port', () => getProxyPort())

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
