/**
 * All IPTV requests are routed through a local proxy in the main process
 * (see src/main/streamProxy.ts) so they use Node's network stack instead of
 * Chromium's. The port is fetched once at startup.
 */

let proxyPort: number | null = null

export async function initProxy(): Promise<void> {
  try {
    proxyPort = await window.api.getProxyPort()
  } catch {
    proxyPort = null
  }
}

export function proxyUrl(target: string): string {
  if (!proxyPort) return target
  return `http://127.0.0.1:${proxyPort}/proxy?url=${encodeURIComponent(target)}`
}
