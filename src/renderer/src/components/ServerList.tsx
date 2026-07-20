import { Loader2, Pencil, Plug, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useServerStore } from '../stores/servers'
import type { ServerProfile } from '../types'
import { ServerForm } from './ServerForm'

/** Saved-server list with connect / edit / delete, reused by setup & settings. */
export function ServerList(): JSX.Element {
  const servers = useServerStore((s) => s.servers)
  const active = useServerStore((s) => s.active)
  const status = useServerStore((s) => s.status)
  const connect = useServerStore((s) => s.connect)
  const remove = useServerStore((s) => s.remove)

  const [editing, setEditing] = useState<ServerProfile | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [connectingId, setConnectingId] = useState<string | null>(null)

  const handleConnect = async (server: ServerProfile): Promise<void> => {
    setConnectingId(server.id)
    await connect(server)
    setConnectingId(null)
  }

  if (servers.length === 0) {
    return <p className="py-4 text-center text-sm text-zinc-500">No servers saved yet.</p>
  }

  return (
    <div className="space-y-2">
      {servers.map((server) => {
        const isActive = active?.id === server.id && status === 'connected'
        return (
          <div
            key={server.id}
            className={`flex items-center gap-3 rounded-lg border p-3 ${
              isActive
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                : 'border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{server.name}</p>
              <p className="truncate text-xs text-zinc-500">
                {server.url} · {server.username}
              </p>
            </div>
            {confirmDelete === server.id ? (
              <div className="flex items-center gap-2 text-xs">
                <span>Delete?</span>
                <button onClick={() => remove(server.id)} className="font-semibold text-red-500 hover:underline">
                  Yes
                </button>
                <button onClick={() => setConfirmDelete(null)} className="text-zinc-500 hover:underline">
                  No
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => handleConnect(server)}
                  disabled={connectingId !== null || isActive}
                  title={isActive ? 'Connected' : 'Connect'}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {connectingId === server.id ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} />}
                  {isActive ? 'Connected' : 'Connect'}
                </button>
                <button
                  onClick={() => setEditing(server)}
                  title="Edit"
                  className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => setConfirmDelete(server.id)}
                  title="Delete"
                  className="rounded-lg p-2 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                >
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
        )
      })}
      {editing && <ServerForm server={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
