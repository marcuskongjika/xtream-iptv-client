import { LogOut, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ServerForm } from '../components/ServerForm'
import { ServerList } from '../components/ServerList'
import { useContentStore } from '../stores/content'
import { useHistoryStore } from '../stores/history'
import { useServerStore } from '../stores/servers'
import { toast } from '../stores/toast'
import { useUIStore } from '../stores/ui'
import { formatEpochDate } from '../utils/format'

export function SettingsScreen(): JSX.Element {
  const [showAddForm, setShowAddForm] = useState(false)
  const [version, setVersion] = useState('')

  const userInfo = useServerStore((s) => s.userInfo)
  const disconnect = useServerStore((s) => s.disconnect)
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const viewMode = useUIStore((s) => s.viewMode)
  const setViewMode = useUIStore((s) => s.setViewMode)
  const resetContent = useContentStore((s) => s.reset)
  const clearHistory = useHistoryStore((s) => s.clear)

  useEffect(() => {
    window.api.getAppVersion().then(setVersion).catch(() => undefined)
  }, [])

  const selectClass =
    'rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-800'

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl space-y-8">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">Servers</h2>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
            >
              <Plus size={14} />
              Add server
            </button>
          </div>
          <ServerList />
        </section>

        {userInfo && (
          <section>
            <h2 className="mb-3 text-base font-bold">Account</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
              <Info label="Username" value={userInfo.username} />
              <Info label="Status" value={userInfo.status} />
              <Info label="Expires" value={formatEpochDate(userInfo.exp_date)} />
              <Info label="Trial" value={userInfo.is_trial === '1' ? 'Yes' : 'No'} />
              <Info label="Active connections" value={String(userInfo.active_cons)} />
              <Info label="Max connections" value={String(userInfo.max_connections)} />
            </div>
            <button
              onClick={disconnect}
              className="mt-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <LogOut size={14} />
              Disconnect
            </button>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-base font-bold">Preferences</h2>
          <div className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <label className="flex items-center justify-between text-sm">
              <span className="font-medium">Theme</span>
              <select className={selectClass} value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-sm">
              <span className="font-medium">Default view</span>
              <select
                className={selectClass}
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as 'grid' | 'list')}
              >
                <option value="grid">Grid</option>
                <option value="list">List</option>
              </select>
            </label>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-base font-bold">Data</h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                resetContent()
                toast('Content cache cleared', 'success')
              }}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Clear content cache
            </button>
            <button
              onClick={() => {
                clearHistory()
                toast('Watch history cleared', 'success')
              }}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Clear watch history
            </button>
          </div>
        </section>

        <p className="text-xs text-zinc-500">Xtream IPTV Client {version && `v${version}`}</p>
      </div>

      {showAddForm && <ServerForm onClose={() => setShowAddForm(false)} />}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="font-medium">{value || '—'}</p>
    </div>
  )
}
