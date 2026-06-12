/**
 * Per-child pages: learning insights, monthly report, achievements,
 * readiness explainer and past summaries. Soft-skill values render as
 * qualitative bars (SkillBar), never numeric percentages (§6.3).
 */
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/icons'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { ChildPageHeader } from '../../components/parent/ChildPageHeader'
import { ShareActions } from '../../components/parent/ShareActions'
import { SkillBar } from '../../components/parent/SkillBar'
import { SummaryView } from '../../components/parent/SummaryView'
import { parentKeys } from '../../components/parent/hooks'
import { formatDay } from '../../components/parent/format'
import {
  getAchievements,
  getChildReadiness,
  getLearningInsights,
  getMonthlyReport,
  getSummaryById,
  getSummaryHistory,
  type SoftSkills,
} from '../../lib/api/parent'

const SKILL_LABELS: [keyof SoftSkills, string][] = [
  ['persistence', 'Persistence'],
  ['curiosity', 'Curiosity'],
  ['focus', 'Focus'],
  ['independence', 'Independence'],
  ['consistency', 'Consistency'],
]

// ── Learning insights ─────────────────────────────────────────────────

export function InsightsPage() {
  const { childId = '' } = useParams()
  const q = useQuery({
    queryKey: parentKeys.insights(childId),
    queryFn: () => getLearningInsights(childId),
  })
  if (q.isPending) return <LoadingState />
  if (q.isError)
    return <ErrorState title="Couldn't load insights" error={q.error} onRetry={() => q.refetch()} />
  const d = q.data

  return (
    <div className="space-y-6">
      <ChildPageHeader
        childId={childId}
        title="Learning Insights"
        subtitle="Qualities that grow with practice — not a report card."
      />
      {d.status !== 'ready' ? (
        <EmptyState
          icon="sparkles"
          title="Insights are still brewing"
          description={
            d.status_message ??
            `After ${d.required_tests} completed tests we can share meaningful patterns. ${d.current_tests} of ${d.required_tests} so far — almost there!`
          }
        />
      ) : (
        <>
          <Card className="p-6">
            <h2 className="text-base font-semibold text-ink">Effort qualities</h2>
            <div className="mt-4 space-y-4">
              {SKILL_LABELS.map(([key, label]) => (
                <SkillBar key={key} label={label} value={d.soft_skills[key] ?? 0} />
              ))}
            </div>
          </Card>
          {d.insights.length > 0 && (
            <Card className="p-6">
              <h2 className="text-base font-semibold text-ink">What we noticed</h2>
              <ul className="mt-3 space-y-3">
                {d.insights.map((i, k) => (
                  <li key={k} className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-soft">
                    <span aria-hidden className="mt-0.5">{i.icon || '✨'}</span>
                    {i.text}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

// ── Monthly report ────────────────────────────────────────────────────

export function MonthlyReportPage() {
  const { childId = '' } = useParams()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const q = useQuery({
    queryKey: parentKeys.monthlyReport(childId, month, year),
    queryFn: () => getMonthlyReport(childId, month, year),
  })

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1)
    setMonth(d.getMonth() + 1)
    setYear(d.getFullYear())
  }
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  return (
    <div className="space-y-6">
      <ChildPageHeader
        childId={childId}
        title="Monthly Report"
        subtitle="A month of effort, gathered in one place."
      />
      <div className="flex items-center gap-3">
        <button
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-soft hover:bg-primary-tint"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
        >
          <Icon name="chevron-left" className="h-4 w-4 text-ink-soft" />
        </button>
        <span className="min-w-36 text-center text-sm font-semibold text-ink">
          {new Date(year, month - 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </span>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-soft hover:bg-primary-tint disabled:opacity-40"
          onClick={() => shiftMonth(1)}
          disabled={isCurrentMonth}
          aria-label="Next month"
        >
          <Icon name="chevron-left" className="h-4 w-4 rotate-180 text-ink-soft" />
        </button>
      </div>

      {q.isPending ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState title="Couldn't load the report" error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <ReportBody childId={childId} d={q.data} />
      )}
    </div>
  )
}

function ReportBody({
  d,
}: {
  childId: string
  d: Awaited<ReturnType<typeof getMonthlyReport>>
}) {
  return (
    <div className="space-y-5">
      <Card className="p-6">
        <p className="text-sm leading-relaxed text-ink-soft">{d.narrative}</p>
      </Card>
      <div className="grid grid-cols-3 gap-4">
        {(
          [
            ['Practice days', d.practice_days],
            ['Sessions', d.total_sessions],
            ['Questions', d.total_questions],
          ] as const
        ).map(([label, value]) => (
          <Card key={label} className="p-5 text-center">
            <p className="text-xl font-bold text-ink">{value}</p>
            <p className="mt-1 text-xs font-medium text-ink-muted">{label}</p>
          </Card>
        ))}
      </div>
      {d.effort_calendar.length > 0 && (
        <Card className="p-6">
          <h2 className="text-base font-semibold text-ink">Effort calendar</h2>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {d.effort_calendar.map((day) => (
              <span
                key={day.date}
                title={formatDay(day.date)}
                className={`h-5 w-5 rounded-md ${day.active ? 'bg-success' : 'bg-slate-100'}`}
              />
            ))}
          </div>
        </Card>
      )}
      {d.soft_skills_current && (
        <Card className="p-6">
          <h2 className="text-base font-semibold text-ink">Effort qualities this month</h2>
          <div className="mt-4 space-y-4">
            {SKILL_LABELS.map(([key, label]) => (
              <SkillBar key={key} label={label} value={d.soft_skills_current[key] ?? 0} />
            ))}
          </div>
        </Card>
      )}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-ink">Gentle suggestions</h2>
        <ul className="mt-3 space-y-2">
          {d.recommendations.map((r, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-soft">
              <Icon name="sparkles" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {r}
            </li>
          ))}
        </ul>
        <ShareActions className="mt-5" text={d.share_text} />
      </Card>
    </div>
  )
}

// ── Achievements ──────────────────────────────────────────────────────

export function AchievementsPage() {
  const { childId = '' } = useParams()
  const q = useQuery({
    queryKey: parentKeys.achievements(childId),
    queryFn: () => getAchievements(childId),
  })
  if (q.isPending) return <LoadingState />
  if (q.isError)
    return <ErrorState title="Couldn't load achievements" error={q.error} onRetry={() => q.refetch()} />

  return (
    <div className="space-y-6">
      <ChildPageHeader
        childId={childId}
        title="Achievements"
        subtitle="Wins worth a hug — share them if you like."
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {q.data.achievements.map((a, i) => (
          <Card key={i} className="flex h-full flex-col p-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden>
                {a.emoji}
              </span>
              <div>
                <h2 className="text-base font-bold text-ink">{a.title}</h2>
                <p className="text-xs text-ink-muted">{a.subtitle}</p>
              </div>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">{a.message}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-surface p-3 text-center">
                <p className="text-lg font-bold text-ink">{a.stat_value}</p>
                <p className="text-[11px] font-medium text-ink-muted">{a.stat_label}</p>
              </div>
              <div className="rounded-xl bg-surface p-3 text-center">
                <p className="text-lg font-bold text-ink">{a.secondary_stat_value}</p>
                <p className="text-[11px] font-medium text-ink-muted">{a.secondary_stat_label}</p>
              </div>
            </div>
            <ShareActions className="mt-4" text={`${a.title} — ${a.message}`} />
          </Card>
        ))}
      </div>
    </div>
  )
}

// ── Readiness explainer ───────────────────────────────────────────────

export function ReadinessPage() {
  const { childId = '' } = useParams()
  const q = useQuery({
    queryKey: parentKeys.readiness(childId),
    queryFn: () => getChildReadiness(childId),
  })
  if (q.isPending) return <LoadingState />
  if (q.isError)
    return <ErrorState title="Couldn't load readiness" error={q.error} onRetry={() => q.refetch()} />
  const d = q.data

  return (
    <div className="space-y-6">
      <ChildPageHeader
        childId={childId}
        title="Readiness"
        subtitle="Where confidence stands — compared only to their own journey."
      />
      <Card className="p-6">
        <Badge tone="primary">{d.label}</Badge>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{d.description}</p>
      </Card>
      {d.factors.length > 0 && (
        <Card className="p-6">
          <h2 className="text-base font-semibold text-ink">What shapes this</h2>
          <ul className="mt-3 space-y-2">
            {d.factors.map((f, i) => {
              const support = f.startsWith('Needs support')
              return (
                <li key={i} className="flex items-start gap-2.5 text-sm text-ink-soft">
                  <Icon
                    name={support ? 'alert' : 'check'}
                    className={`mt-0.5 h-4 w-4 shrink-0 ${support ? 'text-band-yellow' : 'text-success'}`}
                  />
                  {f}
                </li>
              )
            })}
          </ul>
        </Card>
      )}
      <p className="text-xs leading-relaxed text-ink-muted">
        Readiness reflects how {d.child_first_name} engages with practice — it is never a mark,
        and never a comparison with other children.
      </p>
    </div>
  )
}

// ── Past summaries ────────────────────────────────────────────────────

export function PastSummariesPage() {
  const { childId = '' } = useParams()
  const q = useQuery({
    queryKey: parentKeys.summaries(childId),
    queryFn: () => getSummaryHistory(childId),
  })
  if (q.isPending) return <LoadingState />
  if (q.isError)
    return <ErrorState title="Couldn't load past summaries" error={q.error} onRetry={() => q.refetch()} />

  return (
    <div className="space-y-6">
      <ChildPageHeader
        childId={childId}
        title="Past Summaries"
        subtitle="Earlier chapters of the story."
      />
      {q.data.summaries.length === 0 ? (
        <EmptyState
          icon="chart"
          title="No summaries yet"
          description="The first weekly summary appears after the first reviewed week."
        />
      ) : (
        <ul className="space-y-3">
          {q.data.summaries.map((s) => (
            <li key={s.id}>
              <Link to={`/parent/children/${childId}/summaries/${s.id}`}>
                <Card className="flex items-center justify-between gap-3 p-5 transition-shadow hover:shadow-md">
                  <div>
                    <p className="text-sm font-semibold text-ink">{s.headline}</p>
                    <p className="mt-1 text-xs text-ink-muted">{s.period_display}</p>
                  </div>
                  <Icon name="chevron-left" className="h-4 w-4 rotate-180 text-ink-muted" />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function SummaryDetailPage() {
  const { childId = '', summaryId = '' } = useParams()
  const q = useQuery({
    queryKey: parentKeys.summaryDetail(summaryId),
    queryFn: () => getSummaryById(summaryId),
  })
  if (q.isPending) return <LoadingState />
  if (q.isError)
    return <ErrorState title="Couldn't load this summary" error={q.error} onRetry={() => q.refetch()} />
  return (
    <div className="space-y-6">
      <ChildPageHeader childId={childId} title={q.data.period_display} />
      <SummaryView summary={q.data} />
    </div>
  )
}
