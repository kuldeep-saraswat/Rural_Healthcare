import type { ReactNode } from 'react'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { cx } from '@/lib/utils'

export type CalloutTone = 'info' | 'warn' | 'danger' | 'ok' | 'neutral' | 'care'

const TONES: Record<
  CalloutTone,
  { box: string; icon: string; title: string; body: string; defaultIcon: IconName }
> = {
  info: {
    box: 'bg-info-50 border-info-200',
    icon: 'text-info-600',
    title: 'text-info-700',
    body: 'text-ink-700',
    defaultIcon: 'info',
  },
  warn: {
    box: 'bg-warn-50 border-warn-200',
    icon: 'text-warn-600',
    title: 'text-warn-700',
    body: 'text-ink-700',
    defaultIcon: 'alert',
  },
  danger: {
    box: 'bg-sos-50 border-sos-200',
    icon: 'text-sos-600',
    title: 'text-sos-700',
    body: 'text-ink-700',
    defaultIcon: 'alertCircle',
  },
  ok: {
    box: 'bg-ok-50 border-ok-200',
    icon: 'text-ok-600',
    title: 'text-ok-700',
    body: 'text-ink-700',
    defaultIcon: 'checkCircle',
  },
  neutral: {
    box: 'bg-surface border-hairline',
    icon: 'text-ink-400',
    title: 'text-ink-900',
    body: 'text-ink-600',
    defaultIcon: 'info',
  },
  care: {
    box: 'bg-care-50 border-care-200',
    icon: 'text-care-600',
    title: 'text-care-800',
    body: 'text-ink-700',
    defaultIcon: 'shieldCheck',
  },
}

/**
 * A standing note attached to content: safety information, prototype
 * honesty, a live warning. Never used for transient feedback - that is a Toast.
 */
export function Callout({
  tone = 'info',
  title,
  icon,
  children,
  className,
  actions,
}: {
  tone?: CalloutTone
  title?: ReactNode
  /** Overrides the tone's default icon. */
  icon?: IconName
  children?: ReactNode
  className?: string
  actions?: ReactNode
}) {
  const style = TONES[tone]
  return (
    <div
      className={cx('rounded-card border p-3.5 sm:p-4', style.box, className)}
      role={tone === 'danger' ? 'alert' : undefined}
    >
      <div className="flex gap-3">
        <Icon
          name={icon ?? style.defaultIcon}
          size={20}
          className={cx('mt-px', style.icon)}
        />
        <div className="min-w-0 flex-1">
          {title ? (
            <div className={cx('text-sm leading-snug font-semibold', style.title)}>{title}</div>
          ) : null}
          {children ? (
            <div className={cx('text-sm leading-relaxed', style.body, title ? 'mt-1' : null)}>
              {children}
            </div>
          ) : null}
          {actions ? <div className="mt-3.5 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
    </div>
  )
}

/** Fine-print safety note under clinical content. */
export function SafetyNote({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-2.5 rounded-card border border-dashed border-ink-200 bg-canvas px-3.5 py-3 text-xs leading-relaxed text-ink-600">
      <Icon name="shield" size={16} className="mt-px shrink-0 text-ink-400" />
      <span>
        <span className="font-semibold text-ink-800">Safety: </span>
        {children}
      </span>
    </div>
  )
}
