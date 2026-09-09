import type { ReactNode } from 'react'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { cx } from '@/lib/utils'

export interface TabItem {
  id: string
  label: string
  badge?: ReactNode
  icon?: IconName
}

/**
 * Underline tab list. Roving tab index: arrow keys move between tabs, and the
 * selected tab is the only one in the page tab order.
 *
 * Underline rather than filled pills - it reads as navigation inside a
 * surface instead of competing with the page's buttons.
 */
export function Tabs({
  items,
  active,
  onChange,
  ariaLabel,
  className,
}: {
  items: TabItem[]
  active: string
  onChange: (id: string) => void
  ariaLabel: string
  className?: string
}) {
  const index = items.findIndex((i) => i.id === active)
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cx(
        'no-scrollbar mb-5 flex gap-1 overflow-x-auto border-b border-hairline',
        className,
      )}
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
              'group relative inline-flex min-h-11 shrink-0 items-center gap-2 px-3.5 pb-2.5 text-sm font-semibold transition-colors duration-[var(--duration-fast)]',
              selected ? 'text-care-700' : 'text-ink-500 hover:text-ink-900',
            )}
          >
            {item.icon ? <Icon name={item.icon} size={16} /> : null}
            {item.label}
            {item.badge !== undefined && item.badge !== null ? (
              <span
                className={cx(
                  'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-2xs font-bold tabular-nums transition-colors',
                  selected ? 'bg-care-100 text-care-800' : 'bg-ink-100 text-ink-600',
                )}
              >
                {item.badge}
              </span>
            ) : null}
            <span
              aria-hidden="true"
              className={cx(
                'absolute inset-x-1.5 -bottom-px h-[2px] rounded-full transition-colors duration-[var(--duration-base)]',
                selected ? 'bg-care-600' : 'bg-transparent group-hover:bg-ink-200',
              )}
            />
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
    <div role="tabpanel" aria-label={id} className="rc-fade-in">
      {children}
    </div>
  )
}
