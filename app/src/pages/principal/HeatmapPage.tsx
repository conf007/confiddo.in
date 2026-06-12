/**
 * Readiness heatmap: one health status per class × subject cell over the
 * rolling 4-week window (backend collapses weeks). Aggregates only.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { principalKeys } from '../../components/principal/hooks'
import { getHeatmap } from '../../lib/api/principal'

/** Band colors from the design tokens — not the backend hex (legend text still shown). */
const STATUS_CLASS: Record<string, string> = {
  high_avoidance: 'bg-band-red/15 text-band-red',
  mixed: 'bg-band-yellow/15 text-band-yellow',
  strong: 'bg-band-green/15 text-band-green',
}

export function HeatmapPage() {
  const q = useQuery({ queryKey: principalKeys.heatmap, queryFn: getHeatmap })
  if (q.isPending) return <LoadingState />
  if (q.isError)
    return <ErrorState title="Couldn't load the heatmap" error={q.error} onRetry={() => q.refetch()} />
  const d = q.data

  const cell = (cls: string, subject: string) =>
    d.cells.find((c) => c.class === cls && c.subject === subject)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Readiness Heatmap</h1>
        <p className="mt-1 text-sm text-ink-muted">{d.period} · classes × subjects</p>
      </header>

      {d.cells.length === 0 ? (
        <EmptyState
          icon="grid"
          title="No assessed classes yet"
          description="Once weekly reviews are validated, class health appears here."
        />
      ) : (
        <Card className="overflow-x-auto p-6">
          <table className="w-full min-w-130 border-separate border-spacing-1.5">
            <thead>
              <tr>
                <th className="pr-3 text-left text-xs font-semibold text-ink-muted">Class</th>
                {d.subjects.map((s) => (
                  <th key={s} className="px-2 pb-1 text-center text-xs font-semibold text-ink-muted">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.classes.map((cls) => (
                <tr key={cls}>
                  <td className="pr-3 text-sm font-medium whitespace-nowrap text-ink">{cls}</td>
                  {d.subjects.map((s) => {
                    const c = cell(cls, s)
                    return (
                      <td key={s} className="text-center">
                        {c ? (
                          <Link
                            to={`/principal/classes/${c.class_id}`}
                            title={`${cls} · ${s}${c.teacher_name ? ` · ${c.teacher_name}` : ''}`}
                            className={[
                              'block rounded-lg px-2 py-3 text-xs font-semibold transition-opacity hover:opacity-80',
                              STATUS_CLASS[c.status] ?? 'bg-slate-100 text-ink-muted',
                            ].join(' ')}
                          >
                            {d.legend[c.status]?.label ?? c.status}
                          </Link>
                        ) : (
                          <span className="block rounded-lg bg-surface px-2 py-3 text-xs text-ink-muted">
                            —
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-ink-muted">
            {Object.entries(d.legend).map(([key, l]) => (
              <span key={key} className="inline-flex items-center gap-1.5">
                <span className={`h-3 w-3 rounded ${STATUS_CLASS[key]?.split(' ')[0] ?? 'bg-slate-200'}`} />
                {l.label}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
