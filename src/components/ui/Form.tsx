import { useId } from 'react'
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { Icon } from './Icon'
import { cx } from '@/lib/utils'

/* ---------------------------------------------------------------------------
   Form controls.

   Every control is at least 44px tall, has a hairline border that darkens on
   hover, and a two-tone focus state (teal border + soft ring) so focus is
   obvious without shouting. Errors are announced, not just coloured.
--------------------------------------------------------------------------- */

const CONTROL =
  'w-full min-h-11 rounded-card border border-hairline-strong bg-surface px-3.5 py-2.5 text-[15px] text-ink-900 shadow-xs transition-[border-color,box-shadow] duration-[var(--duration-fast)] placeholder:text-ink-400 hover:border-ink-300 focus:border-care-500 focus:shadow-[var(--shadow-focus)] focus:outline-none disabled:cursor-not-allowed disabled:bg-canvas disabled:text-ink-500'

const CONTROL_ERROR = 'border-sos-500 focus:border-sos-500 focus:shadow-[0_0_0_3px_rgb(211_45_36/0.18)]'

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
  children: (props: { id: string; describedBy?: string; invalid?: boolean }) => ReactNode
}) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')
  return (
    <div className="mb-4">
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-ink-700"
      >
        {label}
        {required ? (
          <span className="text-sos-600" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children({ id, describedBy: describedBy || undefined, invalid: Boolean(error) })}
      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-xs leading-relaxed text-ink-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-sos-700"
        >
          <Icon name="alertCircle" size={14} className="mt-px shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function TextInput({
  className,
  invalid,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cx(CONTROL, invalid && CONTROL_ERROR, className)}
      {...rest}
    />
  )
}

/** Text input with a leading icon; used for search and filter boxes. */
export function SearchInput({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className="relative block">
      <Icon
        name="search"
        size={18}
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400"
      />
      <input type="search" className={cx(CONTROL, 'pl-11', className)} {...rest} />
    </span>
  )
}

export function TextArea({
  className,
  invalid,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cx(CONTROL, 'min-h-24 leading-relaxed', invalid && CONTROL_ERROR, className)}
      {...rest}
    />
  )
}

export function Select({
  className,
  children,
  invalid,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <span className="relative block">
      <select
        aria-invalid={invalid || undefined}
        className={cx(CONTROL, 'appearance-none pr-10', invalid && CONTROL_ERROR, className)}
        {...rest}
      >
        {children}
      </select>
      <Icon
        name="chevronDown"
        size={16}
        strokeWidth={2}
        className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-400"
      />
    </span>
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
    <div className="mb-2.5 flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked)
        }}
        className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded-xs border-hairline-strong accent-[var(--color-care-600)]"
      />
      <label htmlFor={id} className="text-[15px] leading-snug text-ink-900">
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
    <div className="flex items-start justify-between gap-4 border-b border-hairline py-3.5 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink-900">{label}</div>
        {description ? (
          <div className="mt-0.5 text-[13px] leading-relaxed text-ink-500">{description}</div>
        ) : null}
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
          'relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-[var(--duration-base)]',
          checked ? 'border-care-600 bg-care-600' : 'border-hairline-strong bg-ink-100',
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            'absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-[var(--duration-base)]',
            checked ? 'left-[23px]' : 'left-[3px]',
          )}
        />
      </button>
    </div>
  )
}

export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-x-4 sm:grid-cols-2">{children}</div>
}

/** Segmented control: a compact set of mutually exclusive choices. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cx(
        'inline-flex items-center gap-0.5 rounded-card border border-hairline bg-canvas p-0.5',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => {
            onChange(option.value)
          }}
          className={cx(
            'min-h-9 rounded-sm px-3 text-[13px] font-semibold transition-colors',
            value === option.value
              ? 'bg-surface text-ink-900 shadow-xs'
              : 'text-ink-600 hover:text-ink-900',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
