import { cx, pct } from '@/lib/utils'

/**
 * Hand-rolled SVG/CSS charts. No chart library is pulled in, which keeps the
 * bundle small for low-bandwidth users.
 *
 * Every chart is also readable as text: each row states its value, and the
 * whole figure carries an accessible summary. Colour is ordered so the first
 * series is always the calm primary and warning colours only appear where the
 * data is genuinely a warning.
 */

const SERIES = [
  'var(--color-care-600)',
  'var(--color-info-500)',
  'var(--color-care-300)',
  'var(--color-warn-500)',
  'var(--color-ink-400)',
  'var(--color-sos-500)',
]

export interface BarDatum {
  label: string
  value: number
  hint?: string
  tone?: 'care' | 'warn' | 'danger' | 'info'
}

const TONE_FILL = {
  care: 'bg-care-500',
  warn: 'bg-warn-500',
  danger: 'bg-sos-500',
  info: 'bg-info-500',
}

/** Horizontal bars - the most legible chart shape on a narrow phone. */
export function BarList({
  data,
  max,
  unit = '',
  ariaLabel,
}: {
  data: BarDatum[]
  max?: number
  unit?: string
  ariaLabel: string
}) {
  const ceiling = max ?? Math.max(1, ...data.map((d) => d.value))
  return (
    <figure aria-label={ariaLabel} className="space-y-3">
      {data.map((datum) => (
        <div key={datum.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-ink-800">{datum.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-ink-900">
              {datum.value}
              {unit}
              {datum.hint ? (
                <span className="ml-2 text-xs font-normal text-ink-500">{datum.hint}</span>
              ) : null}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={cx(
                'h-full rounded-full transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out-soft)]',
                TONE_FILL[datum.tone ?? 'care'],
              )}
              style={{ width: `${Math.max(2, pct(datum.value, ceiling))}%` }}
            />
          </div>
        </div>
      ))}
    </figure>
  )
}

export interface DonutSlice {
  label: string
  value: number
}

export function Donut({
  slices,
  size = 140,
  centerLabel,
  centerValue,
  ariaLabel,
}: {
  slices: DonutSlice[]
  size?: number
  centerLabel?: string
  centerValue?: string | number
  ariaLabel: string
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0)
  const stroke = 14
  const radius = size / 2 - stroke / 2 - 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <figure aria-label={ariaLabel} className="flex flex-wrap items-center gap-x-6 gap-y-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
        <title>{ariaLabel}</title>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-ink-100)"
          strokeWidth={stroke}
        />
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {total === 0
            ? null
            : slices.map((slice, index) => {
                const length = (slice.value / total) * circumference
                const dash = `${Math.max(0, length - 1.5)} ${circumference - length + 1.5}`
                const element = (
                  <circle
                    key={slice.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={SERIES[index % SERIES.length]}
                    strokeWidth={stroke}
                    strokeLinecap="butt"
                    strokeDasharray={dash}
                    strokeDashoffset={-offset}
                  />
                )
                offset += length
                return element
              })}
        </g>
        {centerValue !== undefined ? (
          <text
            x="50%"
            y={centerLabel ? '47%' : '52%'}
            textAnchor="middle"
            style={{
              fontSize: 24,
              fontWeight: 700,
              fill: 'var(--color-ink-900)',
              letterSpacing: '-0.02em',
            }}
          >
            {centerValue}
          </text>
        ) : null}
        {centerLabel ? (
          <text
            x="50%"
            y="63%"
            textAnchor="middle"
            style={{ fontSize: 10, fill: 'var(--color-ink-500)', fontWeight: 500 }}
          >
            {centerLabel}
          </text>
        ) : null}
      </svg>
      <figcaption className="min-w-0 flex-1">
        <ul className="space-y-2 text-sm">
          {slices.map((slice, index) => (
            <li key={slice.label} className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: SERIES[index % SERIES.length] }}
              />
              <span className="min-w-0 flex-1 truncate text-ink-600">{slice.label}</span>
              <span className="font-semibold tabular-nums text-ink-900">{slice.value}</span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  )
}

/** Occupancy / utilisation meter with a text value beside it. */
export function Meter({
  label,
  value,
  total,
  unit = '',
  dangerAt = 85,
}: {
  label: string
  value: number
  total: number
  unit?: string
  dangerAt?: number
}) {
  const percentage = pct(value, total)
  const tone =
    percentage >= dangerAt ? 'bg-sos-500' : percentage >= 65 ? 'bg-warn-500' : 'bg-ok-500'
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-ink-800">{label}</span>
        <span className="tabular-nums text-ink-600">
          <span className="font-semibold text-ink-900">
            {value}/{total}
            {unit}
          </span>{' '}
          ({percentage}%)
        </span>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100"
        role="meter"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${percentage} percent`}
      >
        <div
          className={cx(
            'h-full rounded-full transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out-soft)]',
            tone,
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

/** Tiny inline bar row used inside tables and dense lists. */
export function MiniBar({
  value,
  max,
  tone = 'care',
}: {
  value: number
  max: number
  tone?: 'care' | 'warn' | 'danger' | 'info'
}) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-1.5 w-16 overflow-hidden rounded-full bg-ink-100 align-middle"
    >
      <span
        className={cx('block h-full rounded-full', TONE_FILL[tone])}
        style={{ width: `${Math.max(3, pct(value, max))}%` }}
      />
    </span>
  )
}
