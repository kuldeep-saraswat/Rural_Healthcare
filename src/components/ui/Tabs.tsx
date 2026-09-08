import type { ReactNode } from 'react'
import { cx } from '@/lib/utils'

export interface TabItem {
  id: string
  label: string
  badge?: ReactNode
}

/** Roving-tab-index tab list. Arrow keys move, Enter/Space is implicit. */
export function Tabs({
  items,
  active,
  onChange,
  ariaLabel,
}: {
  items: TabItem[]
  active: string
  onChange: (id: string) => void
  ariaLabel: string
}) {
  const index = items.findIndex((i) => i.id === active)
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="no-scrollbar -mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1"
      onKeyDown={(event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
        event.preventDefault()
        const delta = event.key === 'ArrowRight' ? 1 : -1
        const next = (index + delta + items.length) % items.length
        onChange(items[next].id)
      }}
    >
      {items.map((item) => {
        const selected = item.id === active
        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => {
              onChange(item.id)
            }}
            className={cx(
              'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-card border px-3.5 text-sm font-medium transition-colors',
              selected
                ? 'border-care-600 bg-care-600 text-white'
                : 'border-hairline bg-surface text-ink-700 hover:bg-care-50',
            )}
          >
            {item.label}
            {item.badge ? (
              <span
                className={cx(
                  'rounded-full px-1.5 py-0.5 text-[11px] font-bold',
                  selected ? 'bg-white/20' : 'bg-canvas text-ink-700',
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel({
  id,
  active,
  children,
}: {
  id: string
  active: string
  children: ReactNode
}) {
  if (id !== active) return null
  return (
    <div role="tabpanel" aria-label={id}>
      {children}
    </div>
  )
}
