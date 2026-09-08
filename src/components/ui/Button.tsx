import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '@/lib/utils'

export type ButtonTone = 'primary' | 'default' | 'danger' | 'ghost' | 'subtle'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

const TONES: Record<ButtonTone, string> = {
  primary:
    'bg-care-600 text-white border-care-700 hover:bg-care-700 active:bg-care-900 shadow-sm',
  default:
    'bg-white text-ink-900 border-hairline hover:bg-care-50 hover:border-care-300 active:bg-care-100',
  danger: 'bg-sos-600 text-white border-sos-700 hover:bg-sos-700 active:bg-sos-700 shadow-sm',
  ghost: 'bg-transparent text-care-700 border-transparent hover:bg-care-50',
  subtle: 'bg-care-50 text-care-700 border-care-100 hover:bg-care-100',
}

/** Touch targets stay large - rural users often tap on cracked phone screens. */
const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-sm gap-1.5',
  md: 'min-h-11 px-4 text-[15px] gap-2',
  lg: 'min-h-13 px-5 text-base gap-2',
  xl: 'min-h-16 px-6 text-lg gap-2.5 font-semibold',
}

const BASE =
  'inline-flex items-center justify-center rounded-card border font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone
  size?: ButtonSize
  block?: boolean
  icon?: ReactNode
}

export function Button({
  tone = 'default',
  size = 'md',
  block,
  icon,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cx(BASE, TONES[tone], SIZES[size], block && 'w-full', className)}
      {...rest}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </button>
  )
}

export interface LinkButtonProps {
  to: string
  tone?: ButtonTone
  size?: ButtonSize
  block?: boolean
  icon?: ReactNode
  className?: string
  children: ReactNode
  ariaLabel?: string
}

export function LinkButton({
  to,
  tone = 'default',
  size = 'md',
  block,
  icon,
  className,
  children,
  ariaLabel,
}: LinkButtonProps) {
  return (
    <Link
      to={to}
      aria-label={ariaLabel}
      className={cx(BASE, TONES[tone], SIZES[size], block && 'w-full', className)}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </Link>
  )
}
