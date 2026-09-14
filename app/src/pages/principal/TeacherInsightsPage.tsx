import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { Icon } from '../../components/icons'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { principalKeys } from '../../components/principal/hooks'
import { getTeacherInsights } from '../../lib/api/principal'

function minutes(ms: number | null | undefined): string {
  if (!ms) return '—'
  return `${Math.round(ms / 60000)} min`
}

export function TeacherInsightsPage() {
  const { teacherId = '' } = useParams()
  const q = useQuery({ queryKey: principalKeys.teacherInsights(teacherId), queryFn: () => getTeacherInsights(teacherId) })
  if (q.isPending) return <LoadingState />
  if (q.isError) return <ErrorState title="Couldn't load insights" error={q.error} onRetry={() => q.refetch()} />
  const d = q.data
  const stats: [string, string][] = [
    ['Reviews', String(d.total_reviews)],
    ['Students reviewed', String(d.total_students_reviewed)],
    ['Avg time per student', minutes(d.avg_time_per_student_ms)],
    ['AI alignment', `${Math.round(d.ai_alignment_pct)}%`],
  ]
  const breakdown: [string, number][] = [
    ['Agreed', d.decision_breakdown.agree_pct],
    ['Kept the same', d.decision_breakdown.same_pct],
    ['Adjusted', d.decision_breakdown.adjust_pct],
  ]
  return (
    <div className="space-y-6" data-testid="teacher-insights">
      <Link to={`/principal/directory/${teacherId}`} className="inline-flex h-10 items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-light">
        <Icon name="arrow-left" className="h-4 w-4" />
        {d.teacher_name}
      </Link>
      <h1 className="text-2xl font-bold text-ink">Review insights · {d.teacher_name}</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-xs font-medium text-ink-muted">{label}</p>
            <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
          </Card>
        ))}
      </div>
      <Card className="p-6">
        <h2 className="text-base font-semibold text-ink">Decisions</h2>
        <p className="text-xs text-ink-muted">{d.decision_breakdown.total_decisions} decisions</p>
        <ul className="mt-3 space-y-3">
          {breakdown.map(([label, pct]) => (
            <li key={label}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-ink">{label}</span>
                <span className="text-ink-muted">{Math.round(pct)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-6">
        <h2 className="text-base font-semibold text-ink">Weekly</h2>
        {d.weekly_stats.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">No reviews yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {d.weekly_stats.map((w) => (
              <li key={w.week} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink">{w.week}</span>
                <span className="text-ink-muted">
                  {w.students} students · {minutes(w.time_ms)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
