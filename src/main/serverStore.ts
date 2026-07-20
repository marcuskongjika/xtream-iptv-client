import { app, safeStorage } from 'electron'
import { randomUUID } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import type { ServerInput, ServerProfile } from '../shared/types'

interface StoredPassword {
  encrypted: boolean
  data: string
}

interface StoredServer {
  id: string
  name: string
  url: string
  username: string
  password: StoredPassword
  userAgent?: string
  createdAt: string
  lastConnected: string | null
}

function storePath(): string {
  return join(app.getPath('userData'), 'servers.json')
}

function readAll(): StoredServer[] {
  try {
    const file = storePath()
    if (!existsSync(file)) return []
    const parsed = JSON.parse(readFileSync(file, 'utf-8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(servers: StoredServer[]): void {
  const file = storePath()
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(servers, null, 2), 'utf-8')
}

function encryptPassword(plain: string): StoredPassword {
  if (safeStorage.isEncryptionAvailable()) {
    return { encrypted: true, data: safeStorage.encryptString(plain).toString('base64') }
  }
  // Fallback when OS keychain encryption is unavailable (e.g. some Linux setups).
  return { encrypted: false, data: Buffer.from(plain, 'utf-8').toString('base64') }
}

function decryptPassword(stored: StoredPassword): string {
  try {
    if (stored.encrypted) {
      return safeStorage.decryptString(Buffer.from(stored.data, 'base64'))
    }
    return Buffer.from(stored.data, 'base64').toString('utf-8')
  } catch {
    return ''
  }
}

function toProfile(stored: StoredServer): ServerProfile {
  return {
    id: stored.id,
    name: stored.name,
    url: stored.url,
    username: stored.username,
    password: decryptPassword(stored.password),
    userAgent: stored.userAgent,
    createdAt: stored.createdAt,
    lastConnected: stored.lastConnected
  }
}

export function listServers(): ServerProfile[] {
  return readAll().map(toProfile)
}

export function saveServer(input: ServerInput): ServerProfile {
  const servers = readAll()
  const existing = input.id ? servers.find((s) => s.id === input.id) : undefined

  if (existing) {
    existing.name = input.name
    existing.url = input.url
    existing.username = input.username
    existing.password = encryptPassword(input.password)
    existing.userAgent = input.userAgent
    writeAll(servers)
    return toProfile(existing)
  }

  const created: StoredServer = {
    id: randomUUID(),
    name: input.name,
    url: input.url,
    username: input.username,
    password: encryptPassword(input.password),
    userAgent: input.userAgent,
    createdAt: new Date().toISOString(),
    lastConnected: null
  }
  servers.push(created)
  writeAll(servers)
  return toProfile(created)
}

export function deleteServer(id: string): void {
  writeAll(readAll().filter((s) => s.id !== id))
}

export function touchServer(id: string): ServerProfile | null {
  const servers = readAll()
  const server = servers.find((s) => s.id === id)
  if (!server) return null
  server.lastConnected = new Date().toISOString()
  writeAll(servers)
  return toProfile(server)
}
