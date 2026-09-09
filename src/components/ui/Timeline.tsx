import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { cx } from '@/lib/utils'

export interface TimelineStep {
  key: string
  label: string
  at?: string
  by?: string
  note?: string
  state: 'done' | 'current' | 'todo' | 'blocked'
}

const NODE: Record<TimelineStep['state'], { dot: string; rail: string }> = {
  done: { dot: 'border-ok-500 bg-ok-500 text-white', rail: 'bg-ok-200' },
  current: { dot: 'border-care-600 bg-care-600 text-white', rail: 'bg-hairline' },
  blocked: { dot: 'border-sos-500 bg-sos-500 text-white', rail: 'bg-hairline' },
  todo: { dot: 'border-hairline-strong bg-surface text-transparent', rail: 'bg-hairline' },
}

/**
 * Vertical progress timeline - referrals, emergencies, care journeys.
 * The rail segment between two nodes is coloured by the *earlier* node, so a
 * completed run reads as one continuous green line.
 */
export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="relative">
      {steps.map((step, index) => {
        const node = NODE[step.state]
        const last = index === steps.length - 1
        return (
          <li key={step.key} className="relative flex gap-3.5 pb-5 last:pb-0">
            <div className="relative flex w-5 shrink-0 justify-center">
              {!last ? (
                <span
                  aria-hidden="true"
                  className={cx('absolute top-5 bottom-[-20px] w-[2px] rounded-full', node.rail)}
                />
              ) : null}
              <span
                aria-hidden="true"
                className={cx(
                  'relative z-10 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2',
                  node.dot,
                  step.state === 'current' && 'ring-4 ring-care-100',
                )}
              >
                {step.state === 'done' ? (
                  <Icon name="check" size={11} strokeWidth={3.2} />
                ) : step.state === 'blocked' ? (
                  <Icon name="close" size={10} strokeWidth={3.2} />
                ) : null}
              </span>
            </div>
            <div className="min-w-0 flex-1 pb-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  className={cx(
                    'text-sm leading-snug font-semibold',
                    step.state === 'todo' ? 'text-ink-400' : 'text-ink-900',
                  )}
                >
                  {step.label}
                </span>
                {step.state === 'current' ? (
                  <span className="rounded-full bg-care-50 px-2 py-0.5 text-2xs font-bold tracking-wide text-care-700 uppercase">
                    Now
                  </span>
                ) : null}
                {step.state === 'blocked' ? (
                  <span className="rounded-full bg-sos-50 px-2 py-0.5 text-2xs font-bold tracking-wide text-sos-700 uppercase">
                    Needs attention
                  </span>
                ) : null}
              </div>
              {step.at ? <div className="mt-0.5 text-xs text-ink-500">{step.at}</div> : null}
              {step.by ? <div className="text-xs text-ink-500">{step.by}</div> : null}
              {step.note ? (
                <div className="mt-1.5 text-sm leading-relaxed text-ink-700">{step.note}</div>
              ) : null}
            </div>
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
    <ol className="no-scrollbar flex items-stretch gap-1.5 overflow-x-auto pb-1">
      {steps.map((step, index) => {
        const done = activeIndex !== undefined && index < activeIndex
        const current = activeIndex === index
        return (
          <li key={step.label} className="flex shrink-0 items-center gap-1.5">
            <div
              className={cx(
                'min-w-28 rounded-card border px-3 py-2 text-center transition-colors',
                current
                  ? 'border-care-600 bg-care-600 text-white shadow-xs'
                  : done
                    ? 'border-ok-200 bg-ok-50 text-ok-700'
                    : 'border-hairline bg-surface text-ink-500',
              )}
            >
              <div className="text-xs font-semibold">{step.label}</div>
              {step.hint ? (
                <div className={cx('text-2xs', current ? 'text-white/80' : 'text-ink-400')}>
                  {step.hint}
                </div>
              ) : null}
            </div>
            {index < steps.length - 1 ? (
              <Icon name="chevronRight" size={14} className="shrink-0 text-ink-300" />
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
    <div className="mb-5">
      <div className="flex items-center gap-2.5">
        <span className="eyebrow text-care-700">
          Step {step} of {total}
        </span>
        <span aria-hidden="true" className="flex flex-1 gap-1">
          {Array.from({ length: total }).map((_, index) => (
            <span
              key={index}
              className={cx(
                'h-1 flex-1 rounded-full',
                index < step ? 'bg-care-500' : 'bg-hairline',
              )}
            />
          ))}
        </span>
      </div>
      <h2 className="mt-2.5 text-xl font-bold tracking-tight text-ink-900">{title}</h2>
      {children ? <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{children}</p> : null}
    </div>
  )
}
