import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import type { IconName } from './Icon'
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

const TONES: Record<ToastMessage['tone'], { box: string; icon: string; name: IconName }> = {
  ok: { box: 'border-ok-200 bg-surface', icon: 'text-ok-600', name: 'checkCircle' },
  info: { box: 'border-info-200 bg-surface', icon: 'text-info-600', name: 'info' },
  warn: { box: 'border-warn-200 bg-surface', icon: 'text-warn-600', name: 'alert' },
  danger: { box: 'border-sos-200 bg-surface', icon: 'text-sos-600', name: 'alertCircle' },
}

const RAIL: Record<ToastMessage['tone'], string> = {
  ok: 'bg-ok-500',
  info: 'bg-info-500',
  warn: 'bg-warn-500',
  danger: 'bg-sos-500',
}

/**
 * Transient confirmation of something that just happened. Toasts never carry
 * an action the user must take - that belongs on the page.
 */
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
        className="pointer-events-none fixed inset-x-3 bottom-24 z-60 flex flex-col gap-2.5 sm:right-5 sm:bottom-5 sm:left-auto sm:w-[22rem]"
      >
        {toasts.map((toast) => {
          const style = TONES[toast.tone]
          return (
            <div
              key={toast.id}
              className={cx(
                'rc-sheet-up pointer-events-auto relative overflow-hidden rounded-card border p-3.5 pl-4 shadow-lg',
                style.box,
              )}
            >
              <span
                aria-hidden="true"
                className={cx('absolute inset-y-0 left-0 w-1', RAIL[toast.tone])}
              />
              <div className="flex items-start gap-3">
                <Icon name={style.name} size={18} className={cx('mt-px', style.icon)} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm leading-snug font-semibold text-ink-900">
                    {toast.title}
                  </div>
                  {toast.body ? (
                    <div className="mt-0.5 text-[13px] leading-relaxed text-ink-600">
                      {toast.body}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  onClick={() => {
                    setToasts((current) => current.filter((t) => t.id !== toast.id))
                  }}
                  className="-mt-1 -mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-ink-400 transition-colors hover:bg-canvas hover:text-ink-700"
                >
                  <Icon name="close" size={14} strokeWidth={2.2} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
