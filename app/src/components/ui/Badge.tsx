import type { HTMLAttributes } from 'react'

type Tone = 'neutral' | 'primary' | 'accent' | 'success' | 'gold' | 'outline'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

const TONES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-ink-soft',
  primary: 'bg-primary-tint text-primary',
  accent: 'bg-accent-tint text-accent',
  success: 'bg-success-tint text-success',
  gold: 'bg-gold-tint text-amber-700',
  outline: 'border border-slate-200 text-ink-muted bg-transparent',
}

export function Badge({
  tone = 'neutral',
  className = '',
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        TONES[tone],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </span>
  )
}
