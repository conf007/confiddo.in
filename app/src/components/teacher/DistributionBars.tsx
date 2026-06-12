/**
 * Readiness distribution as horizontal count bars — aggregate counts only,
 * never student names (ARCHITECTURE.md §6.3 teacher/principal aggregates).
 * Band colors are allowed here (teacher analytics readiness chips/bars).
 */
import type { LevelDistribution } from '../../lib/api/teacher'

const BAR_CLASSES: Record<string, string> = {
  avoidant: 'bg-band-red/70',
  attempting: 'bg-band-yellow/70',
  practicing: 'bg-slate-400/70',
  confident: 'bg-band-green/70',
  competition_ready: 'bg-band-green',
}

export function DistributionBars({
  distribution,
  total,
}: {
  distribution: LevelDistribution[]
  /** Optional denominator; defaults to max count so bars stay readable. */
  total?: number
}) {
  const max = Math.max(1, total ?? Math.max(...distribution.map((d) => d.count)))
  return (
    <ul className="space-y-2">
      {distribution.map((d) => (
        <li key={d.level} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-xs font-medium text-ink-soft">
            {d.level_display}
          </span>
          <span
            className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
            role="img"
            aria-label={`${d.level_display}: ${d.count}`}
          >
            <span
              className={`block h-full rounded-full ${BAR_CLASSES[d.level] ?? 'bg-primary'}`}
              style={{ width: `${Math.round((d.count / max) * 100)}%` }}
            />
          </span>
          <span className="w-6 shrink-0 text-right text-xs font-semibold text-ink">
            {d.count}
          </span>
        </li>
      ))}
    </ul>
  )
}
