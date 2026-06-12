/**
 * One confidence-metric row for school/class metric views: name, a
 * green/yellow/red stacked count bar, and how many students were measured.
 * Aggregate counts only — never student names (ARCHITECTURE.md §6.3).
 * Band colors are reserved for principal/teacher analytics (index.css).
 */
import type { MetricSummary } from '../../lib/api/principal'

export function MetricHealthRow({ metric }: { metric: MetricSummary }) {
  const { green, yellow, red } = metric.distribution
  const total = Math.max(1, green + yellow + red)
  const seg = (n: number) => `${(n / total) * 100}%`

  return (
    <li className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-ink">{metric.name}</p>
        <p className="shrink-0 text-xs text-ink-muted">
          {metric.students_measured > 0
            ? `${metric.students_measured} measured`
            : 'No data yet'}
        </p>
      </div>
      <p className="mt-0.5 text-xs text-ink-muted">{metric.description}</p>
      {metric.students_measured > 0 && (
        <div
          className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-slate-100"
          role="img"
          aria-label={`${metric.name}: ${green} healthy, ${yellow} watch, ${red} needs support`}
        >
          {green > 0 && <span className="h-full bg-band-green/80" style={{ width: seg(green) }} />}
          {yellow > 0 && <span className="h-full bg-band-yellow/80" style={{ width: seg(yellow) }} />}
          {red > 0 && <span className="h-full bg-band-red/80" style={{ width: seg(red) }} />}
        </div>
      )}
    </li>
  )
}
