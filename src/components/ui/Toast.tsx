import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { cx, newId } from '@/lib/utils'

export interface ToastMessage {
  id: string
  title: string
  body?: string
  tone: 'ok' | 'info' | 'warn' | 'danger'
}

interface ToastApi {
  show: (toast: Omit<ToastMessage, 'id'>) => void
}

const ToastContext = createContext<ToastApi>({ show: () => undefined })

export function useToast(): ToastApi {
  return useContext(ToastContext)
}

const TONES = {
  ok: 'border-ok-500/40 bg-ok-50 text-ok-700',
  info: 'border-info-500/40 bg-info-50 text-info-700',
  warn: 'border-warn-500/40 bg-warn-50 text-warn-700',
  danger: 'border-sos-200 bg-sos-50 text-sos-700',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const show = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = newId('toast')
    setToasts((current) => [...current, { ...toast, id }].slice(-4))
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const api = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-3 bottom-24 z-60 flex flex-col gap-2 sm:right-4 sm:left-auto sm:bottom-4 sm:w-96"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cx(
              'pointer-events-auto rounded-card border p-3 shadow-lg backdrop-blur',
              TONES[toast.tone],
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">{toast.title}</div>
                {toast.body ? <div className="mt-0.5 text-sm text-ink-700">{toast.body}</div> : null}
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => {
                  setToasts((current) => current.filter((t) => t.id !== toast.id))
                }}
                className="rounded-full px-1.5 text-lg leading-none text-ink-500 hover:bg-white/60"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
