import type { ReactNode } from 'react'
import { cx } from '@/lib/utils'

/* ---------------------------------------------------------------------------
   Tables.

   Wide tables scroll inside their own box; the page never scrolls sideways.
   Rows are comfortable rather than dense - these are read on phones too -
   and separators are hairlines so the data, not the grid, carries the eye.
--------------------------------------------------------------------------- */

export function TableWrap({
  children,
  caption,
  /** Minimum width before the table starts scrolling horizontally. */
  minWidth = '40rem',
  className,
}: {
  children: ReactNode
  caption?: string
  minWidth?: string
  className?: string
}) {
  return (
    <div
      className={cx(
        'overflow-x-auto overscroll-x-contain rounded-card border border-hairline bg-surface shadow-xs',
        className,
      )}
    >
      <table
        className="w-full border-collapse text-left text-sm"
        style={{ minWidth }}
      >
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  )
}

export function Th({
  children,
  className,
  scope = 'col',
  align = 'left',
}: {
  children: ReactNode
  className?: string
  scope?: 'col' | 'row'
  align?: 'left' | 'right' | 'center'
}) {
  return (
    <th
      scope={scope}
      className={cx(
        'sticky top-0 z-10 border-b border-hairline bg-surface-muted px-3.5 py-3 text-2xs font-bold tracking-[0.06em] whitespace-nowrap text-ink-500 uppercase',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  className,
  align = 'left',
}: {
  children: ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
}) {
  return (
    <td
      className={cx(
        'border-b border-hairline px-3.5 py-3.5 align-middle text-ink-800',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  )
}

export function Tr({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <tr
      className={cx(
        'transition-colors duration-[var(--duration-fast)] hover:bg-care-50/50 last:[&>td]:border-0',
        className,
      )}
    >
      {children}
    </tr>
  )
}

/** Primary cell content: the thing that identifies the row. */
export function TdPrimary({
  children,
  sub,
  className,
}: {
  children: ReactNode
  sub?: ReactNode
  className?: string
}) {
  return (
    <Td className={className}>
      <span className="block font-semibold text-ink-900">{children}</span>
      {sub ? <span className="mt-0.5 block text-xs text-ink-500">{sub}</span> : null}
    </Td>
  )
}
