import logo from '../assets/logo.svg'

type LogoVariant = 'light' | 'dark'

export interface LogoProps {
  variant?: LogoVariant
  withWordmark?: boolean
  className?: string
}

export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return <img src={logo} alt="" className={`shrink-0 ${className}`} />
}

export function Logo({ variant = 'dark', withWordmark = true, className = '' }: LogoProps) {
  const text = variant === 'light' ? 'text-white' : 'text-ink'
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="h-10 w-10" />
      {withWordmark && (
        <span className={`text-sm font-extrabold tracking-[0.2em] ${text}`}>CONFIDDO</span>
      )}
    </span>
  )
}
