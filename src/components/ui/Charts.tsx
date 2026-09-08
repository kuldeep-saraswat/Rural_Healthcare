import { cx, pct } from '@/lib/utils'

/**
 * Hand-rolled SVG/CSS charts. No chart library is pulled in, which keeps the
 * bundle small for low-bandwidth users. Charts appear on admin screens only.
 *
 * Every chart is also readable as text: each row states its value, and the
 * whole figure carries an accessible summary.
 */

const SERIES = [
  'var(--color-care-600)',
  'var(--color-info-500)',
  'var(--color-warn-500)',
  'var(--color-sos-500)',
  'var(--color-care-300)',
  'var(--color-ink-300)',
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
    <figure aria-label={ariaLabel} className="space-y-2.5">
      {data.map((datum) => (
        <div key={datum.label}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-medium text-ink-900">{datum.label}</span>
            <span className="shrink-0 tabular-nums text-ink-700">
              {datum.value}
              {unit}
              {datum.hint ? <span className="ml-2 text-xs text-ink-500">{datum.hint}</span> : null}
            </span>
          </div>
          <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-canvas">
            <div
              className={cx('h-full rounded-full', TONE_FILL[datum.tone ?? 'care'])}
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
  size = 132,
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
  const radius = size / 2 - 12
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <figure aria-label={ariaLabel} className="flex flex-wrap items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
        <title>{ariaLabel}</title>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {total === 0 ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--color-hairline)"
              strokeWidth="16"
            />
          ) : (
            slices.map((slice, index) => {
              const length = (slice.value / total) * circumference
              const dash = `${length} ${circumference - length}`
              const element = (
                <circle
                  key={slice.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={SERIES[index % SERIES.length]}
                  strokeWidth="16"
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                />
              )
              offset += length
              return element
            })
          )}
        </g>
        {centerValue !== undefined ? (
          <text
            x="50%"
            y="48%"
            textAnchor="middle"
            className="fill-[var(--color-ink-900)] text-lg font-bold"
            style={{ fontSize: 20, fontWeight: 700 }}
          >
            {centerValue}
          </text>
        ) : null}
        {centerLabel ? (
          <text
            x="50%"
            y="64%"
            textAnchor="middle"
            style={{ fontSize: 10, fill: 'var(--color-ink-500)' }}
          >
            {centerLabel}
          </text>
        ) : null}
      </svg>
      <figcaption>
        <ul className="space-y-1 text-sm">
          {slices.map((slice, index) => (
            <li key={slice.label} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ background: SERIES[index % SERIES.length] }}
              />
              <span className="text-ink-700">{slice.label}</span>
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
  const tone = percentage >= dangerAt ? 'bg-sos-500' : percentage >= 65 ? 'bg-warn-500' : 'bg-ok-500'
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-ink-900">{label}</span>
        <span className="tabular-nums text-ink-700">
          {value}/{total}
          {unit} ({percentage}%)
        </span>
      </div>
      <div
        className="mt-1 h-2.5 overflow-hidden rounded-full bg-canvas"
        role="meter"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${percentage} percent`}
      >
        <div className={cx('h-full rounded-full', tone)} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}
