import { useCallback, useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { cx } from '@/lib/utils'

/**
 * Accessible modal: focus moves in on open, Tab is trapped inside the panel,
 * Escape closes, background scroll is locked and focus returns to the trigger.
 *
 * On phones it presents as a bottom sheet (thumb-reachable close, full width);
 * from `sm` up it is a centred panel.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  width?: 'sm' | 'md' | 'lg'
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descId = useId()

  const focusables = useCallback(() => {
    const root = panelRef.current
    if (!root) return [] as HTMLElement[]
    return Array.from(
      root.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.offsetParent !== null || element === document.activeElement)
  }, [])

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open, onClose, focusables])

  if (!open) return null

  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="rc-fade-in absolute inset-0 h-full w-full cursor-default bg-ink-950/45 backdrop-blur-[2px]"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cx(
          'rc-sheet-up relative z-10 flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-hairline bg-surface shadow-xl outline-none sm:my-0 sm:max-h-[86vh] sm:rounded-lg',
          widths[width],
        )}
      >
        {/* Drag affordance: signals "sheet" on touch devices. */}
        <span
          aria-hidden="true"
          className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-ink-200 sm:hidden"
        />
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-hairline px-4 pt-4 pb-3.5 sm:px-5 sm:pt-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[17px] leading-snug font-semibold text-ink-900">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-1 text-sm leading-relaxed text-ink-500">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mt-1 -mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-ink-400 transition-colors hover:bg-canvas hover:text-ink-700"
            aria-label="Close"
          >
            <Icon name="close" size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-hairline bg-surface-muted px-4 py-3.5 sm:px-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
