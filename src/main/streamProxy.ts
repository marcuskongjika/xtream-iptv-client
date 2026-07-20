import { constants as cryptoConstants } from 'crypto'
import { createServer, request as httpRequest, type IncomingMessage, type ServerResponse } from 'http'
import { request as httpsRequest, type RequestOptions } from 'https'
import type { AddressInfo } from 'net'

/**
 * Local HTTP proxy that all IPTV traffic (API + streams) is routed through.
 *
 * IPTV panels are hostile to browser network stacks: they whitelist player
 * user agents, redirect plain-http requests to edge servers with ancient or
 * broken TLS, send no CORS headers, and sometimes live on HSTS-preloaded
 * domains that Chromium force-upgrades to https. Fetching upstream with
 * Node's stack sidesteps all of that: no HSTS, redirects followed here, and
 * TLS configured to be maximally lenient (legacy versions/ciphers, any cert).
 */

const MAX_REDIRECTS = 10
const MAX_PLAYLIST_BYTES = 10 * 1024 * 1024
const UPSTREAM_TIMEOUT_MS = 20_000

let proxyPort = 0

export function getProxyPort(): number {
  return proxyPort
}

export function startStreamProxy(getUserAgent: () => string): Promise<number> {
  const server = createServer((req, res) => {
    handleRequest(req, res, getUserAgent()).catch((err) => {
      console.warn('[proxy] unhandled error:', err instanceof Error ? err.message : err)
      if (!res.headersSent) res.writeHead(502)
      res.end()
    })
  })
  return new Promise((resolve, reject) => {
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      proxyPort = (server.address() as AddressInfo).port
      console.log(`[proxy] stream proxy listening on 127.0.0.1:${proxyPort}`)
      resolve(proxyPort)
    })
  })
}

function proxify(target: string): string {
  return `http://127.0.0.1:${proxyPort}/proxy?url=${encodeURIComponent(target)}`
}

interface UpstreamResult {
  response: IncomingMessage
  finalUrl: string
}

function fetchUpstream(targetUrl: string, userAgent: string, range?: string): Promise<UpstreamResult> {
  return new Promise((resolve, reject) => {
    const visit = (urlString: string, redirectsLeft: number): void => {
      let parsed: URL
      try {
        parsed = new URL(urlString)
      } catch {
        reject(new Error(`Invalid upstream URL: ${urlString}`))
        return
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        reject(new Error(`Unsupported protocol: ${parsed.protocol}`))
        return
      }

      const headers: Record<string, string> = {
        'User-Agent': userAgent,
        Accept: '*/*',
        'Accept-Encoding': 'identity'
      }
      if (range) headers.Range = range

      const isHttps = parsed.protocol === 'https:'
      const options: RequestOptions = {
        method: 'GET',
        headers,
        ...(isHttps
          ? {
              // IPTV edges run broken/legacy TLS — accept anything.
              rejectUnauthorized: false,
              minVersion: 'TLSv1' as const,
              ciphers: 'ALL:@SECLEVEL=0',
              secureOptions: cryptoConstants.SSL_OP_LEGACY_SERVER_CONNECT
            }
          : {})
      }

      const request = (isHttps ? httpsRequest : httpRequest)(parsed, options, (response) => {
        const status = response.statusCode ?? 0
        const location = response.headers.location
        if (status >= 300 && status < 400 && location && redirectsLeft > 0) {
          console.log(`[proxy] redirect ${status}: ${urlString} -> ${location}`)
          response.resume()
          visit(new URL(location, parsed).toString(), redirectsLeft - 1)
          return
        }
        resolve({ response, finalUrl: parsed.toString() })
      })
      request.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
        request.destroy(new Error('Upstream connection timed out'))
      })
      request.on('error', reject)
      request.end()
    }
    visit(targetUrl, MAX_REDIRECTS)
  })
}

/**
 * Rewrite every URI in an HLS playlist (segments, keys, alternate renditions)
 * to go back through this proxy, resolving relative paths against the
 * playlist's final (post-redirect) URL.
 */
function rewritePlaylist(body: string, baseUrl: string): string {
  const toProxy = (uri: string): string => {
    try {
      return proxify(new URL(uri, baseUrl).toString())
    } catch {
      return uri
    }
  }
  return body
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return line
      if (trimmed.startsWith('#')) {
        return line.replace(/URI="([^"]+)"/g, (_match, uri: string) => `URI="${toProxy(uri)}"`)
      }
      return toProxy(trimmed)
    })
    .join('\n')
}

async function handleRequest(req: IncomingMessage, res: ServerResponse, userAgent: string): Promise<void> {
  const requestUrl = new URL(req.url ?? '/', 'http://127.0.0.1')
  const target = requestUrl.searchParams.get('url')
  if (requestUrl.pathname !== '/proxy' || !target) {
    res.writeHead(400, { 'Content-Type': 'text/plain' })
    res.end('Bad request')
    return
  }

  const rangeHeader = typeof req.headers.range === 'string' ? req.headers.range : undefined

  let upstream: UpstreamResult
  try {
    upstream = await fetchUpstream(target, userAgent, rangeHeader)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upstream request failed'
    console.warn('[proxy] failed:', target, '-', message)
    res.writeHead(502, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' })
    res.end(`Proxy error: ${message}`)
    return
  }

  const { response, finalUrl } = upstream
  const status = response.statusCode ?? 502
  const contentType = String(response.headers['content-type'] ?? '')
  const isPlaylist =
    /mpegurl/i.test(contentType) || new URL(finalUrl).pathname.toLowerCase().endsWith('.m3u8')

  res.on('close', () => response.destroy())

  if (isPlaylist && status >= 200 && status < 300) {
    const chunks: Buffer[] = []
    let size = 0
    response.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_PLAYLIST_BYTES) {
        response.destroy()
        res.destroy()
        return
      }
      chunks.push(chunk)
    })
    response.on('end', () => {
      const body = rewritePlaylist(Buffer.concat(chunks).toString('utf-8'), finalUrl)
      res.writeHead(status, {
        'Content-Type': contentType || 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*'
      })
      res.end(body)
    })
    response.on('error', () => res.destroy())
    return
  }

  if (status >= 400) {
    console.warn(`[proxy] upstream HTTP ${status} for`, target)
  }

  const headers: Record<string, string> = { 'Access-Control-Allow-Origin': '*' }
  for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges'] as const) {
    const value = response.headers[name]
    if (typeof value === 'string') headers[name] = value
  }
  res.writeHead(status, headers)
  response.pipe(res)
}
