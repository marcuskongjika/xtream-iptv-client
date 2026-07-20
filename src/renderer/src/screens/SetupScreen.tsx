import { Plus, Tv } from 'lucide-react'
import { useState } from 'react'
import { ServerForm } from '../components/ServerForm'
import { ServerList } from '../components/ServerList'
import { useServerStore } from '../stores/servers'

/** First-run / disconnected screen: pick or add a server. */
export function SetupScreen(): JSX.Element {
  const servers = useServerStore((s) => s.servers)
  const connect = useServerStore((s) => s.connect)
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="flex h-full items-center justify-center bg-zinc-100 p-6 dark:bg-zinc-950">
      <div className="w-full max-w-xl space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white">
            <Tv size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Xtream IPTV Client</h1>
            <p className="text-sm text-zinc-500">
              Connect to an Xtream Codes server to start watching.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">Your servers</h2>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
            >
              <Plus size={14} />
              Add server
            </button>
          </div>
          <ServerList />
        </div>

        <p className="text-center text-xs text-zinc-500">
          Credentials are stored locally and encrypted with your operating system&apos;s keychain.
        </p>
      </div>

      {showForm && (
        <ServerForm
          onClose={() => setShowForm(false)}
          onSaved={(server) => {
            if (servers.length === 0) connect(server)
          }}
        />
      )}
    </div>
  )
}
