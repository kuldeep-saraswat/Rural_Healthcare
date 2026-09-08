import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Button } from './Button'
import { cx } from '@/lib/utils'

export function EmptyState({
  icon = '🗂️',
  title,
  body,
  action,
}: {
  icon?: string
  title: string
  body?: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-card border border-dashed border-hairline bg-surface p-8 text-center">
      <div aria-hidden="true" className="text-3xl">
        {icon}
      </div>
      <h3 className="mt-2 text-base font-semibold text-ink-900">{title}</h3>
      {body ? <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">{body}</p> : null}
      {action ? <div className="mt-4 flex justify-center gap-2">{action}</div> : null}
    </div>
  )
}

export function Loading({ label = 'Loading...', className }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cx('flex items-center gap-3 p-4 text-sm text-ink-500', className)}
    >
      <span
        aria-hidden="true"
        className="rc-spin inline-block h-4 w-4 rounded-full border-2 border-care-200 border-t-care-600"
      />
      {label}
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
    <div role="alert" className="rounded-card border border-sos-200 bg-sos-50 p-6 text-center">
      <div aria-hidden="true" className="text-3xl">
        ⚠️
      </div>
      <h3 className="mt-2 text-base font-semibold text-sos-700">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-700">{body}</p>
      {onRetry ? (
        <div className="mt-4 flex justify-center">
          <Button tone="default" onClick={onRetry}>
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
    console.error(`[RuralCare] render error in ${this.props.label ?? 'screen'}`, error.message, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-4">
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
