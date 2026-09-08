import type { ReactNode } from 'react'
import { cx } from '@/lib/utils'

/** Wide tables scroll inside their own box; the page never scrolls sideways. */
export function TableWrap({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <div className="overflow-x-auto rounded-card border border-hairline bg-surface">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
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
}: {
  children: ReactNode
  className?: string
  scope?: 'col' | 'row'
}) {
  return (
    <th
      scope={scope}
      className={cx(
        'border-b border-hairline bg-canvas px-3 py-2.5 text-xs font-semibold tracking-wide text-ink-500 uppercase',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={cx('border-b border-hairline px-3 py-2.5 align-top text-ink-900', className)}>
      {children}
    </td>
  )
}

export function Tr({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cx('last:[&>td]:border-0', className)}>{children}</tr>
}
