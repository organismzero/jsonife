import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastCtx>({ toast: () => {} })
export const useToast = () => useContext(ToastContext)

const icons: Record<ToastType, ReactNode> = {
  success: <CheckCircle size={14} className="text-[hsl(var(--cta))]" />,
  error: <AlertCircle size={14} className="text-[hsl(var(--destructive))]" />,
  warning: <AlertTriangle size={14} className="text-[hsl(var(--warning))]" />,
  info: <Info size={14} className="text-[hsl(var(--primary))]" />
}

const borderAccent: Record<ToastType, string> = {
  success: 'border-l-[hsl(var(--cta))]',
  error: 'border-l-[hsl(var(--destructive))]',
  warning: 'border-l-[hsl(var(--warning))]',
  info: 'border-l-[hsl(var(--primary))]'
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id))
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  const toast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `toast-${Date.now()}-${Math.random()}`
      setToasts((t) => [...t.slice(-4), { id, message, type }])
      const timer = setTimeout(() => dismiss(id), 4000)
      timers.current.set(id, timer)
    },
    [dismiss]
  )

  useEffect(() => {
    const map = timers.current
    return () => { map.forEach(clearTimeout); map.clear() }
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 right-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`panel-glass flex items-start gap-2 rounded border border-[hsl(var(--border))] border-l-4 px-3 py-2.5 text-sm shadow-lg ${borderAccent[t.type]}`}
          >
            <span className="mt-0.5 shrink-0">{icons[t.type]}</span>
            <span className="flex-1 text-[hsl(var(--foreground))]">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
