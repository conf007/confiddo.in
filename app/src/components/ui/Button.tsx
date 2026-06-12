import type { ButtonHTMLAttributes } from 'react'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'sm'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  full?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-light active:bg-primary',
  accent: 'bg-accent text-white hover:bg-accent-light active:bg-accent',
  secondary:
    'bg-primary-tint text-primary hover:bg-primary/15 active:bg-primary/20',
  ghost: 'bg-transparent text-ink-soft hover:bg-slate-100 active:bg-slate-200',
  danger: 'bg-band-red/10 text-band-red hover:bg-band-red/15',
}

// 48px touch targets (h-12) per design system; sm only for dense desktop UI.
const SIZES: Record<Size, string> = {
  md: 'h-12 px-6 text-sm',
  sm: 'h-10 px-4 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  full = false,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium',
        'transition-colors duration-150 select-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANTS[variant],
        SIZES[size],
        full ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
}
