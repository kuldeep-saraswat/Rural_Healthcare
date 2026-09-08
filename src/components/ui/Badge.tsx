import type { ReactNode } from 'react'
import type { RiskLevel, ServiceStatus, StockStatus } from '@/types'
import { useT } from '@/services/i18n'
import { cx } from '@/lib/utils'

/**
 * Status is never carried by colour alone: every badge pairs a coloured dot
 * with a word, and the dot itself is aria-hidden so screen readers read the
 * word only once.
 */

export type BadgeTone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral'

const TONES: Record<BadgeTone, { chip: string; dot: string }> = {
  ok: { chip: 'bg-ok-50 text-ok-700 border-ok-500/30', dot: 'bg-ok-500' },
  warn: { chip: 'bg-warn-50 text-warn-700 border-warn-500/40', dot: 'bg-warn-500' },
  danger: { chip: 'bg-sos-50 text-sos-700 border-sos-200', dot: 'bg-sos-500' },
  info: { chip: 'bg-info-50 text-info-700 border-info-500/30', dot: 'bg-info-500' },
  neutral: { chip: 'bg-canvas text-ink-700 border-hairline', dot: 'bg-ink-300' },
}

export function Badge({
  tone = 'neutral',
  children,
  dot = true,
  className,
}: {
  tone?: BadgeTone
  children: ReactNode
  dot?: boolean
  className?: string
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
        TONES[tone].chip,
        className,
      )}
    >
      {dot ? (
        <span aria-hidden="true" className={cx('h-2 w-2 shrink-0 rounded-full', TONES[tone].dot)} />
      ) : null}
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

export function RiskBadge({ level, large }: { level: RiskLevel; large?: boolean }) {
  const t = useT()
  return (
    <Badge tone={RISK_TONE[level]} className={large ? 'px-3.5 py-1.5 text-sm' : undefined}>
      {t('risk.level')}: {t(`risk.${level}`)}
    </Badge>
  )
}

export function DemoBadge({ label = 'Demo data' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-ink-300 bg-canvas px-2 py-0.5 text-[11px] font-semibold tracking-wide text-ink-500 uppercase">
      {label}
    </span>
  )
}

export function PendingSyncBadge() {
  return <Badge tone="warn">Waiting to sync</Badge>
}
