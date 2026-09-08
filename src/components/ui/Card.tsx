import type { ReactNode } from 'react'
import { cx } from '@/lib/utils'

export function Card({
  children,
  className,
  tone = 'default',
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  tone?: 'default' | 'danger' | 'warn' | 'ok' | 'info'
  as?: 'div' | 'section' | 'article' | 'li'
}) {
  const tones = {
    default: 'bg-surface border-hairline',
    danger: 'bg-sos-50 border-sos-200',
    warn: 'bg-warn-50 border-warn-500/30',
    ok: 'bg-ok-50 border-ok-500/30',
    info: 'bg-info-50 border-info-500/30',
  }
  return (
    <Tag className={cx('rounded-card border p-4 sm:p-5', tones[tone], className)}>{children}</Tag>
  )
}

export function SectionHeading({
  children,
  sub,
  right,
  id,
}: {
  children: ReactNode
  sub?: ReactNode
  right?: ReactNode
  id?: string
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id={id} className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
          {children}
        </h2>
        {sub ? <p className="mt-1 max-w-2xl text-sm text-ink-500">{sub}</p> : null}
      </div>
      {right}
    </div>
  )
}

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium tracking-wide text-ink-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-[15px] break-words text-ink-900">{children}</dd>
    </div>
  )
}

/** A labelled statistic. Used on dashboards, never on the patient home page. */
export function StatTile({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: 'default' | 'danger' | 'warn' | 'ok' | 'info'
}) {
  const tones = {
    default: 'bg-surface border-hairline text-ink-900',
    danger: 'bg-sos-50 border-sos-200 text-sos-700',
    warn: 'bg-warn-50 border-warn-500/30 text-warn-700',
    ok: 'bg-ok-50 border-ok-500/30 text-ok-700',
    info: 'bg-info-50 border-info-500/30 text-info-700',
  }
  return (
    <div className={cx('rounded-card border p-4', tones[tone])}>
      <div className="text-sm font-medium text-ink-500">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-ink-500">{hint}</div> : null}
    </div>
  )
}
