import { create } from 'zustand'
import { XtreamClient } from '../services/xtream'
import type { AuthResponse, ServerInput, ServerProfile, XtreamServerInfo, XtreamUserInfo } from '../types'
import { toast } from './toast'
import { useContentStore } from './content'

const LAST_SERVER_KEY = 'xiptv-last-server'

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

interface ServerState {
  servers: ServerProfile[]
  active: ServerProfile | null
  status: ConnectionStatus
  error: string | null
  userInfo: XtreamUserInfo | null
  serverInfo: XtreamServerInfo | null
  load: () => Promise<void>
  save: (input: ServerInput) => Promise<ServerProfile | null>
  remove: (id: string) => Promise<void>
  connect: (server: ServerProfile) => Promise<boolean>
  disconnect: () => void
  autoConnect: () => Promise<void>
}

export const useServerStore = create<ServerState>((set, get) => ({
  servers: [],
  active: null,
  status: 'idle',
  error: null,
  userInfo: null,
  serverInfo: null,

  load: async () => {
    try {
      const servers = await window.api.listServers()
      set({ servers })
    } catch {
      toast('Failed to load saved servers', 'error')
    }
  },

  save: async (input) => {
    try {
      const saved = await window.api.saveServer(input)
      await get().load()
      // If the active server was edited, apply its (possibly new) User-Agent
      // immediately and keep the in-memory profile in sync.
      if (get().active?.id === saved.id) {
        set({ active: saved })
        await window.api.setUserAgent(saved.userAgent ?? null)
      }
      return saved
    } catch {
      toast('Failed to save server', 'error')
      return null
    }
  },

  remove: async (id) => {
    try {
      await window.api.deleteServer(id)
      if (get().active?.id === id) get().disconnect()
      await get().load()
    } catch {
      toast('Failed to delete server', 'error')
    }
  },

  connect: async (server) => {
    set({ status: 'connecting', error: null })

    const attempt = async (profile: ServerProfile): Promise<AuthResponse> => {
      // Apply this server's User-Agent to all outgoing requests before auth.
      await window.api.setUserAgent(profile.userAgent ?? null)
      const client = new XtreamClient(profile)
      return client.authenticate()
    }

    try {
      let effective = server
      let auth: AuthResponse
      try {
        auth = await attempt(server)
      } catch (err) {
        // Broken HTTPS is endemic on IPTV panels — when an https:// URL fails
        // for network reasons (not bad credentials), retry over plain HTTP.
        const message = err instanceof Error ? err.message : ''
        const credentialFailure = /^(Login failed|Account is not active)/.test(message)
        if (credentialFailure || !/^https:\/\//i.test(server.url.trim())) throw err
        const httpProfile = { ...server, url: server.url.trim().replace(/^https:/i, 'http:') }
        auth = await attempt(httpProfile)
        effective = httpProfile
        toast('HTTPS connection failed — connected over HTTP instead', 'info')
        // Persist the working URL so future connections skip the failing one.
        window.api
          .saveServer({
            id: server.id,
            name: server.name,
            url: httpProfile.url,
            username: server.username,
            password: server.password,
            userAgent: server.userAgent
          })
          .then(() => get().load())
          .catch(() => undefined)
      }

      useContentStore.getState().reset()
      set({
        active: effective,
        status: 'connected',
        error: null,
        userInfo: auth.user_info ?? null,
        serverInfo: auth.server_info ?? null
      })
      localStorage.setItem(LAST_SERVER_KEY, effective.id)
      window.api.touchServer(effective.id).catch(() => undefined)
      toast(`Connected to ${effective.name}`, 'success')
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed'
      set({ status: 'error', error: message })
      toast(message, 'error')
      return false
    }
  },

  disconnect: () => {
    localStorage.removeItem(LAST_SERVER_KEY)
    useContentStore.getState().reset()
    set({ active: null, status: 'idle', error: null, userInfo: null, serverInfo: null })
  },

  autoConnect: async () => {
    await get().load()
    const lastId = localStorage.getItem(LAST_SERVER_KEY)
    if (!lastId) return
    const server = get().servers.find((s) => s.id === lastId)
    if (server) await get().connect(server)
  }
}))
