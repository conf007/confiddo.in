/**
 * 4px rounded progress bar — full container width, primary or accent fill
 * only, neutral gray track (CLAUDE.md §4). Muted variant for locked items.
 */
export interface ProgressBarProps {
  /** 0..1 */
  value: number
  tone?: 'primary' | 'accent' | 'muted'
  className?: string
  label?: string
}

export function ProgressBar({
  value,
  tone = 'primary',
  className = '',
  label,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  const fill =
    tone === 'accent'
      ? 'bg-accent'
      : tone === 'muted'
        ? 'bg-slate-300'
        : 'bg-primary'
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
      className={`h-1 w-full overflow-hidden rounded-full bg-slate-100 ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${fill}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
