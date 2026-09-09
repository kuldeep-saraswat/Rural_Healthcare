import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Icon, IconChip } from './Icon'
import type { IconName, IconTone } from './Icon'
import { cx } from '@/lib/utils'

/* ---------------------------------------------------------------------------
   Surfaces and page furniture.

   Cards group information; they are not decoration. A card is used when a
   block of content needs its own boundary, and plain sections are used
   everywhere else so the page keeps breathing room.
--------------------------------------------------------------------------- */

export type CardTone = 'default' | 'danger' | 'warn' | 'ok' | 'info' | 'muted' | 'accent'

const CARD_TONES: Record<CardTone, string> = {
  default: 'bg-surface border-hairline',
  danger: 'bg-sos-50 border-sos-200',
  warn: 'bg-warn-50 border-warn-200',
  ok: 'bg-ok-50 border-ok-200',
  info: 'bg-info-50 border-info-200',
  muted: 'bg-canvas border-hairline',
  accent: 'bg-care-50 border-care-200',
}

const CARD_PADDING = {
  none: '',
  sm: 'p-3.5 sm:p-4',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
}

export function Card({
  children,
  className,
  tone = 'default',
  as: Tag = 'div',
  padding = 'md',
  /** Adds a hover lift. Use only when the whole card is a target. */
  interactive = false,
  elevated = false,
}: {
  children: ReactNode
  className?: string
  tone?: CardTone
  as?: 'div' | 'section' | 'article' | 'li'
  padding?: keyof typeof CARD_PADDING
  interactive?: boolean
  elevated?: boolean
}) {
  return (
    <Tag
      className={cx(
        'rounded-card border',
        CARD_TONES[tone],
        CARD_PADDING[padding],
        elevated ? 'shadow-sm' : 'shadow-xs',
        interactive && 'rc-raise cursor-pointer',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

/** Header strip inside a card: title, optional icon, optional right slot. */
export function CardHeader({
  title,
  sub,
  icon,
  iconTone = 'care',
  right,
  className,
}: {
  title: ReactNode
  sub?: ReactNode
  icon?: IconName
  iconTone?: IconTone
  right?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <IconChip name={icon} tone={iconTone} size="sm" /> : null}
        <div className="min-w-0">
          <h3 className="text-[15px] leading-snug font-semibold text-ink-900">{title}</h3>
          {sub ? <p className="mt-0.5 text-sm text-ink-500">{sub}</p> : null}
        </div>
      </div>
      {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Page header. Every screen opens with one: what this page is, one line of
   context, and the primary action for the page.
--------------------------------------------------------------------------- */
export function PageHeader({
  title,
  description,
  eyebrow,
  icon,
  iconTone = 'care',
  actions,
  meta,
  id,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  icon?: IconName
  iconTone?: IconTone
  actions?: ReactNode
  /** Badges / status chips shown under the title. */
  meta?: ReactNode
  id?: string
  className?: string
}) {
  return (
    <header className={cx('flex flex-wrap items-start justify-between gap-x-6 gap-y-4', className)}>
      <div className="flex min-w-0 items-start gap-3.5 sm:gap-4">
        {icon ? <IconChip name={icon} tone={iconTone} size="lg" className="mt-0.5 hidden sm:flex" /> : null}
        <div className="min-w-0">
          {eyebrow ? <p className="eyebrow mb-1.5 text-care-700">{eyebrow}</p> : null}
          <h1
            id={id}
            className="text-[26px] leading-[1.15] font-bold tracking-tight text-ink-900 sm:text-[32px]"
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-600">{description}</p>
          ) : null}
          {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

/** Section title inside a page. One level below PageHeader. */
export function SectionHeading({
  children,
  sub,
  right,
  id,
  icon,
  className,
}: {
  children: ReactNode
  sub?: ReactNode
  right?: ReactNode
  id?: string
  icon?: IconName
  className?: string
}) {
  return (
    <div className={cx('mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2', className)}>
      <div className="min-w-0">
        <h2
          id={id}
          className="flex items-center gap-2 text-lg leading-tight font-semibold tracking-tight text-ink-900 sm:text-xl"
        >
          {icon ? <Icon name={icon} size={20} className="text-care-600" /> : null}
          {children}
        </h2>
        {sub ? <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink-500">{sub}</p> : null}
      </div>
      {right ? <div className="flex shrink-0 flex-wrap items-center gap-2">{right}</div> : null}
    </div>
  )
}

/** Thin label + value pair used inside detail grids. */
export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="eyebrow text-ink-400">{label}</dt>
      <dd className="mt-1 text-[15px] leading-snug break-words text-ink-900">{children}</dd>
    </div>
  )
}

/* ---------------------------------------------------------------------------
   KPI tile. Metric first, label above it, supporting hint below.
   `trend` and `hint` are only ever passed real values by the caller - nothing
   here invents a number.
--------------------------------------------------------------------------- */
export type StatTone = 'default' | 'danger' | 'warn' | 'ok' | 'info' | 'accent'

const STAT_ACCENT: Record<StatTone, { rail: string; value: string; icon: IconTone }> = {
  default: { rail: 'bg-ink-200', value: 'text-ink-900', icon: 'neutral' },
  accent: { rail: 'bg-care-500', value: 'text-ink-900', icon: 'care' },
  danger: { rail: 'bg-sos-500', value: 'text-sos-700', icon: 'danger' },
  warn: { rail: 'bg-warn-500', value: 'text-warn-700', icon: 'warn' },
  ok: { rail: 'bg-ok-500', value: 'text-ok-700', icon: 'ok' },
  info: { rail: 'bg-info-500', value: 'text-info-700', icon: 'info' },
}

export function StatTile({
  label,
  value,
  hint,
  tone = 'default',
  icon,
  /** Optional direction marker; only pass it when the data says so. */
  trend,
  to,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: StatTone
  icon?: IconName
  trend?: { direction: 'up' | 'down' | 'flat'; label: string }
  /** Turns the whole tile into a link to the detail screen. */
  to?: string
}) {
  const accent = STAT_ACCENT[tone]
  const body = (
    <>
      <span
        aria-hidden="true"
        className={cx('absolute inset-y-0 left-0 w-[3px] rounded-l-card', accent.rail)}
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] leading-snug font-medium text-ink-500">{label}</p>
        {icon ? <IconChip name={icon} tone={accent.icon} size="sm" /> : null}
      </div>
      <p
        className={cx(
          'mt-2.5 text-[28px] leading-none font-bold tracking-tight tabular-nums',
          accent.value,
        )}
      >
        {value}
      </p>
      {trend ? (
        <p
          className={cx(
            'mt-2 inline-flex items-center gap-1 text-xs font-semibold',
            trend.direction === 'up'
              ? 'text-ok-700'
              : trend.direction === 'down'
                ? 'text-sos-700'
                : 'text-ink-500',
          )}
        >
          <Icon
            name={
              trend.direction === 'up' ? 'trendUp' : trend.direction === 'down' ? 'trendDown' : 'minus'
            }
            size={14}
            strokeWidth={2.1}
          />
          {trend.label}
        </p>
      ) : null}
      {hint ? <p className="mt-2 text-xs leading-snug text-ink-500">{hint}</p> : null}
    </>
  )

  const shell = cx(
    'relative block overflow-hidden rounded-card border border-hairline bg-surface p-4 pl-[17px] shadow-xs',
  )

  if (to) {
    return (
      <Link to={to} className={cx(shell, 'rc-raise')}>
        {body}
      </Link>
    )
  }
  return <div className={shell}>{body}</div>
}

/** Grid wrapper that keeps every KPI row on the same rhythm. */
export function StatGrid({
  children,
  columns = 4,
  className,
}: {
  children: ReactNode
  columns?: 2 | 3 | 4
  className?: string
}) {
  return (
    <div
      className={cx(
        'grid gap-3 sm:gap-4',
        columns === 2
          ? 'grid-cols-1 sm:grid-cols-2'
          : columns === 3
            ? 'grid-cols-2 lg:grid-cols-3'
            : 'grid-cols-2 lg:grid-cols-4',
        className,
      )}
    >
      {children}
    </div>
  )
}
