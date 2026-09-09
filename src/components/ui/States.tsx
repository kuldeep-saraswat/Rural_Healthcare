import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Button } from './Button'
import { Icon, IconChip, Spinner } from './Icon'
import type { IconName, IconTone } from './Icon'
import { cx } from '@/lib/utils'

/* ---------------------------------------------------------------------------
   Empty, loading and error states.

   None of these invent data to fill a gap: an empty screen says what is
   missing, why, and what the user can do instead.
--------------------------------------------------------------------------- */

export function EmptyState({
  icon = 'list',
  iconTone = 'neutral',
  title,
  body,
  action,
  compact,
}: {
  icon?: IconName
  iconTone?: IconTone
  title: string
  body?: string
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div
      className={cx(
        'flex flex-col items-center rounded-card border border-dashed border-hairline-strong bg-surface text-center',
        compact ? 'px-5 py-7' : 'px-6 py-10 sm:py-12',
      )}
    >
      <IconChip name={icon} tone={iconTone} size="lg" />
      <h3 className="mt-4 text-[15px] font-semibold text-ink-900">{title}</h3>
      {body ? (
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-500">{body}</p>
      ) : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  )
}

export function Loading({
  label = 'Loading...',
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        'flex items-center justify-center gap-2.5 px-4 py-10 text-sm font-medium text-ink-500',
        className,
      )}
    >
      <Spinner size={18} className="text-care-600" />
      {label}
    </div>
  )
}

/** Rectangular placeholder. Only for content that is genuinely still loading. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cx('rc-skeleton block h-4 w-full', className)} />
}

/** Card-shaped skeleton, matching the real card's footprint. */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-card border border-hairline bg-surface p-4 shadow-xs sm:p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-card" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} className={index === lines - 1 ? 'h-3 w-2/3' : 'h-3'} />
        ))}
      </div>
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  body = 'This part of the prototype could not load.',
  onRetry,
}: {
  title?: string
  body?: string
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-card border border-sos-200 bg-sos-50 px-6 py-9 text-center"
    >
      <span
        aria-hidden="true"
        className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-sos-100 text-sos-600 ring-1 ring-sos-200 ring-inset"
      >
        <Icon name="alert" size={24} />
      </span>
      <h3 className="mt-4 text-[15px] font-semibold text-sos-700">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-700">{body}</p>
      {onRetry ? (
        <div className="mt-5">
          <Button tone="default" onClick={onRetry} icon={<Icon name="refresh" size={16} />}>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  )
}

interface BoundaryProps {
  children: ReactNode
  label?: string
}
interface BoundaryState {
  error?: Error
}

/** Keeps one broken screen from taking down the whole app. */
export class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = {}

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Never log patient data - only the component stack.
    console.error(
      `[RuralCare] render error in ${this.props.label ?? 'screen'}`,
      error.message,
      info.componentStack,
    )
  }

  render() {
    if (this.state.error) {
      return (
        <div className="py-4">
          <ErrorState
            title="This screen could not load"
            body={`${this.props.label ?? 'A screen'} hit an unexpected error. You can go back and try again.`}
            onRetry={() => {
              this.setState({ error: undefined })
            }}
          />
        </div>
      )
    }
    return this.props.children
  }
}
