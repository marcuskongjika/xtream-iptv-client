import { useState } from 'react'
import { useServerStore } from '../stores/servers'
import { toast } from '../stores/toast'
import type { ServerProfile } from '../types'
import { isValidServerUrl, normalizeBaseUrl } from '../utils/format'
import { Modal } from './Modal'

interface ServerFormProps {
  server?: ServerProfile
  onClose: () => void
  onSaved?: (server: ServerProfile) => void
}

export function ServerForm({ server, onClose, onSaved }: ServerFormProps): JSX.Element {
  const save = useServerStore((s) => s.save)
  const [name, setName] = useState(server?.name ?? '')
  const [url, setUrl] = useState(server?.url ?? '')
  const [username, setUsername] = useState(server?.username ?? '')
  const [password, setPassword] = useState(server?.password ?? '')
  const [userAgent, setUserAgent] = useState(server?.userAgent ?? '')
  const [saving, setSaving] = useState(false)

  const submit = async (): Promise<void> => {
    if (!name.trim() || !url.trim() || !username.trim() || !password) {
      toast('All fields are required', 'error')
      return
    }
    if (!isValidServerUrl(url)) {
      toast('Server URL is not valid — expected e.g. http://example.com:8080', 'error')
      return
    }
    setSaving(true)
    const saved = await save({
      id: server?.id,
      name: name.trim(),
      url: normalizeBaseUrl(url),
      username: username.trim(),
      password,
      userAgent: userAgent.trim() || undefined
    })
    setSaving(false)
    if (saved) {
      toast(server ? 'Server updated' : 'Server added', 'success')
      onSaved?.(saved)
      onClose()
    }
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-800'

  return (
    <Modal title={server ? 'Edit server' : 'Add server'} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Display name</span>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="My IPTV provider" />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Server URL</span>
          <input className={inputClass} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://example.com:8080" />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Username</span>
            <input className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Password</span>
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
            />
          </label>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">
            User-Agent <span className="font-normal text-zinc-500">(optional)</span>
          </span>
          <input
            className={inputClass}
            value={userAgent}
            onChange={(e) => setUserAgent(e.target.value)}
            placeholder="VLC/3.0.20 LibVLC/3.0.20 (default)"
            list="ua-presets"
            autoComplete="off"
          />
          <datalist id="ua-presets">
            <option value="VLC/3.0.20 LibVLC/3.0.20" />
            <option value="IPTVSmartersPlayer" />
            <option value="okhttp/4.9.3" />
            <option value="TiviMate/4.7.0" />
            <option value="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" />
          </datalist>
          <span className="block text-xs text-zinc-500">
            Some providers only allow known players. If streams return codes like 458, try a different
            agent here.
          </span>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Saving…' : server ? 'Save changes' : 'Add server'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
