import { Plus } from 'lucide-react'
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
          <svg viewBox="0 0 512 512" className="h-14 w-14" role="img" aria-label="Vela logo">
            <defs>
              <linearGradient id="vela-bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#161b3d" />
                <stop offset="1" stopColor="#0a0c1e" />
              </linearGradient>
              <linearGradient id="vela-sail" x1="0.2" y1="0" x2="0.5" y2="1">
                <stop offset="0" stopColor="#38e1f2" />
                <stop offset="1" stopColor="#6366f1" />
              </linearGradient>
            </defs>
            <rect width="512" height="512" rx="115" fill="url(#vela-bg)" />
            <path
              d="M 196 128 C 158 170, 158 342, 196 384 C 250 356, 330 306, 400 256 C 330 206, 250 156, 196 128 Z"
              fill="url(#vela-sail)"
            />
            <path
              d="M 352 112 C 356 130, 362 136, 380 140 C 362 144, 356 150, 352 168 C 348 150, 342 144, 324 140 C 342 136, 348 130, 352 112 Z"
              fill="#e0f2fe"
              opacity="0.9"
            />
          </svg>
          <div>
            <h1 className="text-2xl font-bold">Vela</h1>
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
