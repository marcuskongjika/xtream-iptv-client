import { contextBridge, ipcRenderer } from 'electron'
import type { ServerInput } from '../shared/types'

const api = {
  listServers: () => ipcRenderer.invoke('servers:list'),
  saveServer: (input: ServerInput) => ipcRenderer.invoke('servers:save', input),
  deleteServer: (id: string) => ipcRenderer.invoke('servers:delete', id),
  touchServer: (id: string) => ipcRenderer.invoke('servers:touch', id),
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  setUserAgent: (userAgent: string | null) => ipcRenderer.invoke('network:set-user-agent', userAgent),
  getProxyPort: () => ipcRenderer.invoke('proxy:port')
}

contextBridge.exposeInMainWorld('api', api)

export type PreloadApi = typeof api
