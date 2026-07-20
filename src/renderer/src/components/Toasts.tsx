import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useToastStore } from '../stores/toast'

const icons = {
  info: <Info size={16} className="text-sky-500" />,
  success: <CheckCircle2 size={16} className="text-emerald-500" />,
  error: <AlertCircle size={16} className="text-red-500" />
}

export function Toasts(): JSX.Element {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-2 rounded-lg border border-zinc-200 bg-white p-3 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
        >
          <span className="mt-0.5 shrink-0">{icons[toast.type]}</span>
          <span className="flex-1 break-words">{toast.message}</span>
          <button
            onClick={() => dismiss(toast.id)}
            className="shrink-0 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
