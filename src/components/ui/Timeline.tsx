import type { ReactNode } from 'react'
import { cx } from '@/lib/utils'

export interface TimelineStep {
  key: string
  label: string
  at?: string
  by?: string
  note?: string
  state: 'done' | 'current' | 'todo' | 'blocked'
}

/** Vertical progress timeline - used for referrals, emergencies, care journeys. */
export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="relative ml-3 border-l-2 border-hairline pl-5">
      {steps.map((step) => {
        const tone =
          step.state === 'done'
            ? 'bg-ok-500 border-ok-500'
            : step.state === 'current'
              ? 'bg-care-600 border-care-600'
              : step.state === 'blocked'
                ? 'bg-sos-500 border-sos-500'
                : 'bg-surface border-hairline'
        return (
          <li key={step.key} className="relative pb-5 last:pb-0">
            <span
              aria-hidden="true"
              className={cx(
                'absolute top-1 -left-[1.72rem] h-4 w-4 rounded-full border-2',
                tone,
              )}
            />
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span
                className={cx(
                  'font-semibold',
                  step.state === 'todo' ? 'text-ink-300' : 'text-ink-900',
                )}
              >
                {step.label}
              </span>
              {step.state === 'current' ? (
                <span className="text-xs font-semibold text-care-700">Now</span>
              ) : null}
              {step.state === 'blocked' ? (
                <span className="text-xs font-semibold text-sos-700">Needs attention</span>
              ) : null}
            </div>
            {step.at ? <div className="text-xs text-ink-500">{step.at}</div> : null}
            {step.by ? <div className="text-xs text-ink-500">{step.by}</div> : null}
            {step.note ? <div className="mt-1 text-sm text-ink-700">{step.note}</div> : null}
          </li>
        )
      })}
    </ol>
  )
}

/** Compact horizontal flow, e.g. PATIENT -> ASHA -> DOCTOR -> HOSPITAL. */
export function FlowStrip({
  steps,
  activeIndex,
}: {
  steps: { label: string; hint?: string }[]
  activeIndex?: number
}) {
  return (
    <ol className="no-scrollbar flex items-stretch gap-1 overflow-x-auto pb-1">
      {steps.map((step, index) => {
        const done = activeIndex !== undefined && index < activeIndex
        const current = activeIndex === index
        return (
          <li key={step.label} className="flex shrink-0 items-center gap-1">
            <div
              className={cx(
                'min-w-28 rounded-card border px-3 py-2 text-center',
                current
                  ? 'border-care-600 bg-care-600 text-white'
                  : done
                    ? 'border-ok-500/40 bg-ok-50 text-ok-700'
                    : 'border-hairline bg-surface text-ink-700',
              )}
            >
              <div className="text-xs font-semibold">{step.label}</div>
              {step.hint ? (
                <div className={cx('text-[11px]', current ? 'text-white/80' : 'text-ink-500')}>
                  {step.hint}
                </div>
              ) : null}
            </div>
            {index < steps.length - 1 ? (
              <span aria-hidden="true" className="text-ink-300">
                →
              </span>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

export function StepHeader({
  step,
  total,
  title,
  children,
}: {
  step: number
  total: number
  title: string
  children?: ReactNode
}) {
  return (
    <div className="mb-4">
      <div className="text-xs font-semibold tracking-wide text-care-700 uppercase">
        Step {step} of {total}
      </div>
      <h2 className="mt-1 text-xl font-bold text-ink-900">{title}</h2>
      {children ? <p className="mt-1 text-sm text-ink-500">{children}</p> : null}
    </div>
  )
}
