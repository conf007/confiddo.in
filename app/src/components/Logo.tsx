type LogoVariant = 'light' | 'dark'

export interface LogoProps {
  /** light = for navy/dark surfaces, dark = for light surfaces */
  variant?: LogoVariant
  withWordmark?: boolean
  className?: string
}

export function Logo({
  variant = 'dark',
  withWordmark = true,
  className = '',
}: LogoProps) {
  const text = variant === 'light' ? 'text-white' : 'text-ink'
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-base font-bold text-white shadow-soft">
        C
      </span>
      {withWordmark && (
        <span
          className={`text-sm font-extrabold tracking-[0.2em] ${text}`}
        >
          CONFIDDO
        </span>
      )}
    </span>
  )
}
