import type { ReactNode } from 'react'
import { cx } from '@/lib/utils'

export type CalloutTone = 'info' | 'warn' | 'danger' | 'ok' | 'neutral'

const TONES: Record<CalloutTone, string> = {
  info: 'bg-info-50 border-info-500/30 text-info-700',
  warn: 'bg-warn-50 border-warn-500/40 text-warn-700',
  danger: 'bg-sos-50 border-sos-200 text-sos-700',
  ok: 'bg-ok-50 border-ok-500/30 text-ok-700',
  neutral: 'bg-canvas border-hairline text-ink-700',
}

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
  icon?: ReactNode
  children?: ReactNode
  className?: string
  actions?: ReactNode
}) {
  return (
    <div
      className={cx('rounded-card border p-3 sm:p-4', TONES[tone], className)}
      role={tone === 'danger' ? 'alert' : undefined}
    >
      <div className="flex gap-3">
        {icon ? (
          <span aria-hidden="true" className="text-xl leading-none">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          {title ? <div className="font-semibold">{title}</div> : null}
          {children ? <div className="mt-1 text-sm text-ink-700">{children}</div> : null}
          {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
    </div>
  )
}

export function SafetyNote({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 rounded-card border border-dashed border-ink-300 bg-canvas p-3 text-xs text-ink-700">
      <span className="font-semibold">Safety: </span>
      {children}
    </div>
  )
}
