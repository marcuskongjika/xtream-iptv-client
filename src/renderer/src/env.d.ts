/// <reference types="vite/client" />

import type { ServerInput, ServerProfile } from '../../shared/types'

declare global {
  interface Window {
    api: {
      listServers(): Promise<ServerProfile[]>
      saveServer(input: ServerInput): Promise<ServerProfile>
      deleteServer(id: string): Promise<void>
      touchServer(id: string): Promise<ServerProfile | null>
      getAppVersion(): Promise<string>
      setUserAgent(userAgent: string | null): Promise<void>
      getProxyPort(): Promise<number>
    }
  }
}

export {}
