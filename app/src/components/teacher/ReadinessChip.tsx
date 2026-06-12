/**
 * Readiness word chip. Teachers always see readiness as WORDS, never raw
 * scores (ARCHITECTURE.md §6.3). Display names come from the parity lib
 * (suggestion_model.dart port) — avoidant renders as "Needs Encouragement".
 *
 * `banded` switches on the readiness band colors (--color-band-*) which the
 * design system reserves for readiness category chips in teacher analytics
 * only; everywhere else the chip stays neutral.
 */
import { readinessDisplayName } from '../../lib/parity'

const BAND_CLASSES: Record<string, string> = {
  avoidant: 'bg-band-red/10 text-band-red',
  attempting: 'bg-band-yellow/10 text-band-yellow',
  practicing: 'bg-slate-100 text-ink-soft',
  confident: 'bg-band-green/10 text-band-green',
  competition_ready: 'bg-band-green/10 text-band-green',
}

export function ReadinessChip({
  level,
  display,
  banded = false,
  className = '',
}: {
  /** Readiness code, e.g. "practicing". */
  level: string
  /** Server-provided display string; falls back to the parity-lib mapping. */
  display?: string | null
  banded?: boolean
  className?: string
}) {
  const label = display || readinessDisplayName(level)
  const tone = banded
    ? (BAND_CLASSES[level] ?? 'bg-slate-100 text-ink-soft')
    : 'bg-slate-100 text-ink-soft'
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        tone,
        className,
      ].join(' ')}
    >
      {label}
    </span>
  )
}
