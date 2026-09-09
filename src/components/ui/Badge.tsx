import type { ReactNode } from 'react'
import type { RiskLevel, ServiceStatus, StockStatus } from '@/types'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { useT } from '@/services/i18n'
import { cx } from '@/lib/utils'

/**
 * Status is never carried by colour alone: every badge pairs a coloured dot
 * (or an icon) with a word, and the marker is aria-hidden so screen readers
 * read the word only once.
 */

export type BadgeTone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral' | 'care'

const TONES: Record<BadgeTone, { chip: string; dot: string }> = {
  ok: { chip: 'bg-ok-50 text-ok-700 border-ok-200', dot: 'bg-ok-500' },
  warn: { chip: 'bg-warn-50 text-warn-700 border-warn-200', dot: 'bg-warn-500' },
  danger: { chip: 'bg-sos-50 text-sos-700 border-sos-200', dot: 'bg-sos-500' },
  info: { chip: 'bg-info-50 text-info-700 border-info-200', dot: 'bg-info-500' },
  neutral: { chip: 'bg-canvas text-ink-600 border-hairline', dot: 'bg-ink-400' },
  care: { chip: 'bg-care-50 text-care-700 border-care-100', dot: 'bg-care-500' },
}

export function Badge({
  tone = 'neutral',
  children,
  dot = true,
  icon,
  size = 'md',
  className,
}: {
  tone?: BadgeTone
  children: ReactNode
  dot?: boolean
  /** Replaces the dot with an icon, for badges that carry a specific meaning. */
  icon?: IconName
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-2xs' : 'px-2.5 py-1 text-xs',
        TONES[tone].chip,
        className,
      )}
    >
      {icon ? (
        <Icon name={icon} size={size === 'sm' ? 12 : 13} strokeWidth={2.2} />
      ) : dot ? (
        <span aria-hidden="true" className={cx('h-1.5 w-1.5 shrink-0 rounded-full', TONES[tone].dot)} />
      ) : null}
      {children}
    </span>
  )
}

/** Live count pill, e.g. "12" next to a tab label. */
export function CountPill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'onDark' | 'care'
}) {
  return (
    <span
      className={cx(
        'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-2xs font-bold tabular-nums',
        tone === 'onDark'
          ? 'bg-white/20 text-white'
          : tone === 'care'
            ? 'bg-care-100 text-care-800'
            : 'bg-ink-100 text-ink-600',
      )}
    >
      {children}
    </span>
  )
}

export function StockBadge({ status }: { status: StockStatus }) {
  if (status === 'available') return <Badge tone="ok">Available</Badge>
  if (status === 'low') return <Badge tone="warn">Low stock</Badge>
  return <Badge tone="danger">Out of stock</Badge>
}

export function ServiceBadge({ status, label }: { status: ServiceStatus; label?: string }) {
  return status === 'available' ? (
    <Badge tone="ok">{label ?? 'Available'}</Badge>
  ) : (
    <Badge tone="neutral">{label ?? 'Not available'}</Badge>
  )
}

const RISK_TONE: Record<RiskLevel, BadgeTone> = {
  low: 'ok',
  medium: 'warn',
  high: 'danger',
}

const RISK_ICON: Record<RiskLevel, IconName> = {
  low: 'checkCircle',
  medium: 'alertCircle',
  high: 'alert',
}

export function RiskBadge({ level, large }: { level: RiskLevel; large?: boolean }) {
  const t = useT()
  return (
    <Badge
      tone={RISK_TONE[level]}
      icon={RISK_ICON[level]}
      className={large ? 'px-3 py-1.5 text-[13px]' : undefined}
    >
      {t('risk.level')}: {t(`risk.${level}`)}
    </Badge>
  )
}

/** Marks anything that is fictional prototype data. Deliberately quiet. */
export function DemoBadge({ label = 'Demo data' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-ink-300 bg-surface/60 px-2 py-0.5 text-2xs font-semibold tracking-wide text-ink-500 uppercase">
      {label}
    </span>
  )
}

export function PendingSyncBadge() {
  return (
    <Badge tone="warn" icon="cloudOff">
      Waiting to sync
    </Badge>
  )
}
