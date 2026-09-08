import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cx } from '@/lib/utils'

const CONTROL =
  'w-full rounded-card border border-hairline bg-surface px-3 py-2.5 text-[15px] text-ink-900 placeholder:text-ink-300 focus:border-care-500 min-h-11'

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: (props: { id: string; describedBy?: string }) => ReactNode
}) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')
  return (
    <div className="mb-3">
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-ink-700">
        {label}
        {required ? (
          <span className="text-sos-600" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </label>
      {children({ id, describedBy: describedBy || undefined })}
      {hint ? (
        <p id={hintId} className="mt-1 text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1 text-xs font-medium text-sos-700">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(CONTROL, className)} {...rest} />
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(CONTROL, 'min-h-24 leading-relaxed', className)} {...rest} />
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(CONTROL, 'pr-8', className)} {...rest}>
      {children}
    </select>
  )
}

export function Checkbox({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  hint?: string
}) {
  const id = useId()
  return (
    <div className="mb-2 flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked)
        }}
        className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-care-600)]"
      />
      <label htmlFor={id} className="text-[15px] text-ink-900">
        {label}
        {hint ? <span className="mt-0.5 block text-xs text-ink-500">{hint}</span> : null}
      </label>
    </div>
  )
}

export function Toggle({
  label,
  checked,
  onChange,
  description,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  description?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-hairline py-3 last:border-0">
      <div className="min-w-0">
        <div className="text-[15px] font-medium text-ink-900">{label}</div>
        {description ? <div className="mt-0.5 text-sm text-ink-500">{description}</div> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => {
          onChange(!checked)
        }}
        className={cx(
          'relative h-7 w-12 shrink-0 rounded-full border transition-colors',
          checked ? 'border-care-700 bg-care-600' : 'border-hairline bg-canvas',
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
            checked ? 'left-6' : 'left-0.5',
          )}
        />
      </button>
    </div>
  )
}

export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-x-4 sm:grid-cols-2">{children}</div>
}
