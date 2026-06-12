/**
 * /teacher/analytics — class analytics (Flutter parity:
 * weekly_summary_screen.dart, class_analytics_screen.dart,
 * class_comparison_screen.dart, teacher_analytics_screen.dart).
 *
 * Endpoints:
 *   GET /teacher/classes/{id}/summary                (teacher.py:377-388)
 *   GET /teacher/classes/{id}/readiness-distribution (teacher.py:1208-1301)
 *   GET /teacher/classes/{id}/score-analytics        (teacher.py:425-441)
 *   GET /teacher/classes/compare                     (teacher.py:526-534)
 *   GET /teacher/analytics                           (teacher.py:628-636)
 *
 * Privacy: charts show aggregate distribution COUNTS and class-level
 * averages only — never named students in charts (ARCHITECTURE.md §6.3).
 * Weekly-summary "highlights" are a first-name list (backend-provided,
 * same as the Flutter screen), rendered as a list, not a chart.
 */
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { DistributionBars } from '../../components/teacher/DistributionBars'
import { teacherKeys } from '../../components/teacher/hooks'
import {
  getClassComparison,
  getClassScoreAnalytics,
  getReadinessDistribution,
  getTeacherAnalytics,
  getTeacherClasses,
  getWeeklySummary,
} from '../../lib/api/teacher'
import { friendlyError } from '../../lib/api/errors'

function formatMs(ms: number): string {
  if (ms <= 0) return '—'
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

export function AnalyticsPage() {
  const [params, setParams] = useSearchParams()
  const classes = useQuery({ queryKey: teacherKeys.classes, queryFn: getTeacherClasses })

  const classList = classes.data?.classes ?? []
  const classId = params.get('classId') ?? classList[0]?.id ?? ''

  const summary = useQuery({
    queryKey: teacherKeys.weeklySummary(classId),
    queryFn: () => getWeeklySummary(classId),
    enabled: !!classId,
  })
  const distribution = useQuery({
    queryKey: teacherKeys.readinessDistribution(classId),
    queryFn: () => getReadinessDistribution(classId),
    enabled: !!classId,
  })
  const scores = useQuery({
    queryKey: teacherKeys.scoreAnalytics(classId),
    queryFn: () => getClassScoreAnalytics(classId),
    enabled: !!classId,
  })
  const comparison = useQuery({
    queryKey: teacherKeys.comparison,
    queryFn: getClassComparison,
  })
  const self = useQuery({
    queryKey: teacherKeys.selfAnalytics,
    queryFn: getTeacherAnalytics,
  })

  if (classes.isLoading) return <LoadingState />
  if (!classes.data) {
    return (
      <ErrorState
        title="We couldn't load analytics"
        error={classes.error}
        onRetry={() => classes.refetch()}
        icon="chart-line"
      />
    )
  }
  if (classList.length === 0) {
    return (
      <EmptyState
        icon="chart-line"
        title="No classes to analyze yet"
        description="Analytics appear once you have an accepted class with student activity."
      />
    )
  }

  const s = summary.data
  const maxAvg = Math.max(1, ...(scores.data?.per_test.map((t) => t.avg_score_pct) ?? []))

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Analytics</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Readiness distributions and trends — counts, not names.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <span className="sr-only">Class</span>
          <select
            value={classId}
            onChange={(e) => setParams({ classId: e.target.value }, { replace: true })}
            className="h-12 rounded-xl border border-slate-200 bg-card px-4 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            {classList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.subject}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly summary */}
        <Card>
          <h2 className="text-sm font-semibold text-ink">This week's summary</h2>
          {summary.isLoading ? (
            <p className="mt-3 text-sm text-ink-muted">Loading…</p>
          ) : !s ? (
            <p className="mt-3 text-sm text-ink-muted">
              {friendlyError(summary.error, 'No summary available yet.')}
            </p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-success-tint px-3 py-2.5">
                  <p className="text-lg font-bold text-success">{s.movement.moved_up}</p>
                  <p className="text-xs text-ink-muted">moved up</p>
                </div>
                <div className="rounded-xl bg-surface px-3 py-2.5">
                  <p className="text-lg font-bold text-ink">{s.movement.stayed}</p>
                  <p className="text-xs text-ink-muted">stayed</p>
                </div>
                <div className="rounded-xl bg-band-red/5 px-3 py-2.5">
                  <p className="text-lg font-bold text-band-red">{s.movement.moved_down}</p>
                  <p className="text-xs text-ink-muted">moved down</p>
                </div>
              </div>
              <div className="mt-4">
                <DistributionBars distribution={s.distribution} />
              </div>
              {s.highlights.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                    Highlights
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {s.highlights.map((h, i) => (
                      <li key={i} className="text-xs text-ink-soft">
                        <span className="font-medium text-ink">
                          {h.student_first_name}
                        </span>{' '}
                        {h.description}{' '}
                        <span aria-hidden>{h.change_type === 'up' ? '↑' : '↓'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </Card>

        {/* 4-week readiness distribution */}
        <Card>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">Readiness distribution</h2>
            {distribution.data && (
              <Badge tone="neutral">{distribution.data.period}</Badge>
            )}
          </div>
          {distribution.isLoading ? (
            <p className="mt-3 text-sm text-ink-muted">Loading…</p>
          ) : !distribution.data ? (
            <p className="mt-3 text-sm text-ink-muted">
              {friendlyError(distribution.error, 'No distribution data yet.')}
            </p>
          ) : (
            <>
              <p className="mt-1 text-xs text-ink-muted">
                {distribution.data.total_students} students, rolling 4-week window
              </p>
              <div className="mt-4">
                <DistributionBars distribution={distribution.data.distribution} />
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Class average trend (class-level aggregate, no student names) */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">Class average by test</h2>
          {scores.data && scores.data.per_test.length > 0 && (
            <p className="text-xs text-ink-soft">
              Current avg{' '}
              <span className="font-semibold text-ink">{scores.data.current_avg}%</span>
              {scores.data.trend_pct !== 0 && (
                <span
                  className={
                    scores.data.trend_pct > 0 ? 'ml-1.5 text-success' : 'ml-1.5 text-band-red'
                  }
                >
                  {scores.data.trend_pct > 0 ? '+' : ''}
                  {scores.data.trend_pct}% vs previous
                </span>
              )}
            </p>
          )}
        </div>
        {scores.isLoading ? (
          <p className="mt-3 text-sm text-ink-muted">Loading…</p>
        ) : !scores.data || scores.data.per_test.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            No completed tests yet — the trend appears after the first test.
          </p>
        ) : (
          <div
            className="mt-4 flex items-end gap-3 overflow-x-auto pb-1"
            role="img"
            aria-label="Class average percentage per test"
          >
            {scores.data.per_test.map((t) => (
              <div key={t.test_id} className="flex w-16 shrink-0 flex-col items-center gap-1">
                <span className="text-xs font-semibold text-ink">{t.avg_score_pct}%</span>
                <div className="flex h-28 w-7 items-end overflow-hidden rounded-md bg-slate-100">
                  <div
                    className="w-full rounded-md bg-primary/70"
                    style={{ height: `${Math.round((t.avg_score_pct / maxAvg) * 100)}%` }}
                  />
                </div>
                <span className="w-full truncate text-center text-[10px] text-ink-muted">
                  {t.test_title}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Class comparison */}
      <Card>
        <h2 className="text-sm font-semibold text-ink">Across your classes</h2>
        {comparison.isLoading ? (
          <p className="mt-3 text-sm text-ink-muted">Loading…</p>
        ) : !comparison.data || comparison.data.classes.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            {friendlyError(comparison.error, 'Comparison appears once classes have data.')}
          </p>
        ) : (
          <>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {comparison.data.classes.map((c) => (
                <div key={c.class_id} className="rounded-xl border border-slate-100 p-4">
                  <p className="text-sm font-medium text-ink">{c.class_name}</p>
                  <p className="mb-3 text-xs text-ink-muted">
                    Grade {c.grade} • {c.subject} • {c.student_count} students
                  </p>
                  <DistributionBars distribution={c.distribution} />
                </div>
              ))}
            </div>
            {comparison.data.insights.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-ink-soft">
                {comparison.data.insights.map((i, idx) => (
                  <li key={idx}>
                    <span className="font-medium text-ink">{i.title}</span> — {i.description}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>

      {/* Teacher self-analytics */}
      <Card>
        <h2 className="text-sm font-semibold text-ink">Your review patterns</h2>
        {self.isLoading ? (
          <p className="mt-3 text-sm text-ink-muted">Loading…</p>
        ) : !self.data ? (
          <p className="mt-3 text-sm text-ink-muted">
            {friendlyError(self.error, 'Review stats appear after your first review.')}
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-surface px-4 py-3 text-center">
              <p className="text-xl font-bold text-ink">{self.data.total_reviews}</p>
              <p className="text-xs text-ink-muted">reviews done</p>
            </div>
            <div className="rounded-xl bg-surface px-4 py-3 text-center">
              <p className="text-xl font-bold text-ink">
                {self.data.total_students_reviewed}
              </p>
              <p className="text-xs text-ink-muted">students reviewed</p>
            </div>
            <div className="rounded-xl bg-surface px-4 py-3 text-center">
              <p className="text-xl font-bold text-ink">
                {formatMs(self.data.avg_time_per_student_ms)}
              </p>
              <p className="text-xs text-ink-muted">avg per student</p>
            </div>
            <div className="rounded-xl bg-surface px-4 py-3 text-center">
              <p className="text-xl font-bold text-ink">{self.data.ai_alignment_pct}%</p>
              <p className="text-xs text-ink-muted">agreement with suggestions</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
