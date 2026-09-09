import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Spinner } from './Icon'
import { cx } from '@/lib/utils'

/* ---------------------------------------------------------------------------
   One button system for the whole product.

   primary  - the single most important action on a surface
   default  - the standard secondary action (white, hairline border)
   subtle   - a tinted quiet action, for repeated inline actions in lists
   ghost    - minimal, for tertiary actions and toolbars
   danger   - destructive or emergency only
--------------------------------------------------------------------------- */

export type ButtonTone = 'primary' | 'default' | 'danger' | 'ghost' | 'subtle'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

const TONES: Record<ButtonTone, string> = {
  primary:
    'bg-care-600 text-white border-care-600 shadow-xs hover:bg-care-700 hover:border-care-700 active:bg-care-800 focus-visible:outline-care-700',
  default:
    'bg-surface text-ink-800 border-hairline-strong shadow-xs hover:bg-canvas hover:border-ink-300 hover:text-ink-900 active:bg-canvas-alt',
  danger:
    'bg-sos-600 text-white border-sos-600 shadow-xs hover:bg-sos-700 hover:border-sos-700 active:bg-sos-900 focus-visible:outline-sos-700',
  ghost:
    'bg-transparent text-ink-700 border-transparent hover:bg-ink-100 hover:text-ink-900 active:bg-ink-200',
  subtle:
    'bg-care-50 text-care-700 border-care-100 hover:bg-care-100 hover:border-care-200 active:bg-care-200',
}

/** Touch targets stay large - rural users often tap on cracked phone screens. */
const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-[13px] gap-1.5 rounded-sm',
  md: 'min-h-11 px-4 text-sm gap-2 rounded-card',
  lg: 'min-h-12 px-5 text-[15px] gap-2 rounded-card',
  xl: 'min-h-14 px-6 text-base gap-2.5 rounded-card',
}

const BASE =
  'relative inline-flex items-center justify-center border font-semibold select-none whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-soft)] active:translate-y-px disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone
  size?: ButtonSize
  block?: boolean
  icon?: ReactNode
  /** Icon after the label, e.g. a chevron on a "next" action. */
  iconAfter?: ReactNode
  loading?: boolean
}

export function Button({
  tone = 'default',
  size = 'md',
  block,
  icon,
  iconAfter,
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      className={cx(BASE, TONES[tone], SIZES[size], block && 'w-full', className)}
      {...rest}
    >
      {loading ? <Spinner size={size === 'sm' ? 14 : 16} /> : icon}
      {children}
      {iconAfter}
    </button>
  )
}

export interface LinkButtonProps {
  to: string
  tone?: ButtonTone
  size?: ButtonSize
  block?: boolean
  icon?: ReactNode
  iconAfter?: ReactNode
  className?: string
  children: ReactNode
  ariaLabel?: string
  onClick?: () => void
}

export function LinkButton({
  to,
  tone = 'default',
  size = 'md',
  block,
  icon,
  iconAfter,
  className,
  children,
  ariaLabel,
  onClick,
}: LinkButtonProps) {
  return (
    <Link
      to={to}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cx(BASE, TONES[tone], SIZES[size], block && 'w-full', className)}
    >
      {icon}
      {children}
      {iconAfter}
    </Link>
  )
}

/**
 * Square icon-only button for chrome (header, toolbars). Requires a label:
 * an unlabelled icon button is invisible to a screen reader.
 */
export function IconButton({
  label,
  icon,
  tone = 'default',
  size = 'md',
  className,
  ...rest
}: Omit<ButtonProps, 'children' | 'icon' | 'iconAfter' | 'block'> & {
  label: string
  icon: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        BASE,
        TONES[tone],
        size === 'sm' ? 'h-9 w-9 rounded-sm' : 'h-11 w-11 rounded-card',
        'px-0',
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  )
}
