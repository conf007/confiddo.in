/**
 * Per-child overview: This Week (narrative summary + growth card),
 * 4-Week progress and Full Journey tabs, plus the tools grid.
 * Effort-not-marks: narratives and readiness words only (§6.3).
 */
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon, type IconName } from '../../components/icons'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { ReadinessChip } from '../../components/teacher/ReadinessChip'
import { SummaryView } from '../../components/parent/SummaryView'
import { GrowthCardView } from '../../components/parent/GrowthCardView'
import { ShareActions } from '../../components/parent/ShareActions'
import { parentKeys } from '../../components/parent/hooks'
import {
  getChildSummary,
  getFullJourney,
  getPagedFourWeekProgress,
  shareGrowthCard,
  type JourneySubject,
  type PagedSubjectProgress,
} from '../../lib/api/parent'

type Tab = 'week' | 'four' | 'journey'

const TOOLS: { to: string; label: string; icon: IconName; blurb: string }[] = [
  { to: 'activity', label: 'Activity Feed', icon: 'clipboard', blurb: 'Day-by-day practice story' },
  { to: 'engagement', label: 'Engagement', icon: 'flame', blurb: 'Streaks and practice rhythm' },
  { to: 'starters', label: 'Conversation Starters', icon: 'message', blurb: 'Talk about learning, not marks' },
  { to: 'goals', label: 'Home Goals', icon: 'check', blurb: 'Gentle weekly goals' },
  { to: 'insights', label: 'Learning Insights', icon: 'chart-line', blurb: 'Effort qualities over time' },
  { to: 'monthly', label: 'Monthly Report', icon: 'book', blurb: 'A month of effort, summarized' },
  { to: 'achievements', label: 'Achievements', icon: 'medal', blurb: 'Wins worth celebrating' },
  { to: 'readiness', label: 'Readiness', icon: 'sparkles', blurb: 'Where confidence stands' },
  { to: 'summaries', label: 'Past Summaries', icon: 'chart', blurb: 'Earlier weekly stories' },
]

export function ChildOverviewPage() {
  const { childId = '' } = useParams()
  const [tab, setTab] = useState<Tab>('week')

  return (
    <div className="space-y-6">
      <Link
        to="/parent"
        className="inline-flex h-10 items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-light"
      >
        <Icon name="arrow-left" className="h-4 w-4" />
        All children
      </Link>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Progress views">
        {(
          [
            ['week', 'This Week'],
            ['four', '4-Week Progress'],
            ['journey', 'Full Journey'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={[
              'h-12 rounded-xl px-5 text-sm font-medium transition-colors',
              tab === key
                ? 'bg-primary text-white'
                : 'bg-card text-ink-soft shadow-soft hover:bg-primary-tint hover:text-primary',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'week' && <ThisWeekTab childId={childId} />}
      {tab === 'four' && <FourWeekTab childId={childId} />}
      {tab === 'journey' && <JourneyTab childId={childId} />}

      <section aria-label="More for your family">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-muted uppercase">
          More for your family
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => (
            <Link key={t.to} to={`/parent/children/${childId}/${t.to}`}>
              <Card className="flex h-full items-start gap-3 p-5 transition-shadow hover:shadow-md">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary">
                  <Icon name={t.icon} className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{t.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                    {t.blurb}
                  </span>
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function ThisWeekTab({ childId }: { childId: string }) {
  const q = useQuery({
    queryKey: parentKeys.summary(childId),
    queryFn: () => getChildSummary(childId),
  })
  if (q.isPending) return <LoadingState />
  if (q.isError)
    return <ErrorState title="Couldn't load this week's summary" error={q.error} onRetry={() => q.refetch()} />
  const s = q.data
  return (
    <div className="space-y-5">
      <SummaryView summary={s} />
      {s.growth_card && (
        <Card className="space-y-4 p-6">
          <GrowthCardView card={s.growth_card} />
          <ShareActions
            text={s.growth_card.share_message}
            onShare={() => shareGrowthCard(s.growth_card!.id).catch(() => {})}
          />
        </Card>
      )}
    </div>
  )
}

/** Shared week-level grid for 4-week + journey tabs (readiness words only). */
function WeekLevelGrid({
  weekLabels,
  subjects,
}: {
  weekLabels: string[]
  subjects: (PagedSubjectProgress | JourneySubject)[]
}) {
  if (subjects.length === 0)
    return (
      <EmptyState
        icon="chart"
        title="No progress to show yet"
        description="As tests are reviewed each week, the journey fills in here."
      />
    )
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-130 border-separate border-spacing-y-2 text-left">
        <thead>
          <tr>
            <th className="pr-4 text-xs font-semibold text-ink-muted">Subject</th>
            {weekLabels.map((w) => (
              <th key={w} className="px-2 text-center text-xs font-semibold text-ink-muted">
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {subjects.map((s) => (
            <tr key={s.name}>
              <td className="pr-4 text-sm font-medium whitespace-nowrap text-ink">
                <span aria-hidden className="mr-1.5">{s.icon}</span>
                {s.name}
              </td>
              {s.weeks.map((w, i) => {
                const level =
                  'level' in w ? w.level : (w as JourneySubject['weeks'][number]).child_level
                const display =
                  'level_display' in w && w.level_display
                    ? w.level_display
                    : level
                return (
                  <td key={i} className="px-2 text-center">
                    {level ? (
                      <ReadinessChip level={level} display={display} banded />
                    ) : (
                      <span className="text-xs text-ink-muted">—</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InsightCards({
  attention,
  positive,
}: {
  attention: { subject: string; message: string }[]
  positive: { subject: string; message: string }[]
}) {
  if (attention.length + positive.length === 0) return null
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {positive.length > 0 && (
        <Card className="border-l-4 border-success bg-success-tint/40 p-5">
          <h3 className="text-sm font-semibold text-ink">Going well</h3>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-soft">
            {positive.map((i, k) => (
              <li key={k}>
                <span className="font-medium">{i.subject}:</span> {i.message}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {attention.length > 0 && (
        <Card className="border-l-4 border-accent bg-accent-tint/40 p-5">
          <h3 className="text-sm font-semibold text-ink">Worth a gentle nudge</h3>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-soft">
            {attention.map((i, k) => (
              <li key={k}>
                <span className="font-medium">{i.subject}:</span> {i.message}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function FourWeekTab({ childId }: { childId: string }) {
  const [page, setPage] = useState(0)
  const q = useQuery({
    queryKey: parentKeys.fourWeekPaged(childId, page),
    queryFn: () => getPagedFourWeekProgress(childId, page),
  })
  if (q.isPending) return <LoadingState />
  if (q.isError)
    return <ErrorState title="Couldn't load 4-week progress" error={q.error} onRetry={() => q.refetch()} />
  const d = q.data
  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">Readiness by week</h2>
          {d.total_pages > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <button
                className="h-10 rounded-lg px-3 text-primary disabled:text-ink-muted"
                disabled={page + 1 >= d.total_pages}
                onClick={() => setPage((p) => p + 1)}
              >
                ← Earlier
              </button>
              <span className="text-xs text-ink-muted">
                {page + 1} / {d.total_pages}
              </span>
              <button
                className="h-10 rounded-lg px-3 text-primary disabled:text-ink-muted"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Recent →
              </button>
            </div>
          )}
        </div>
        <WeekLevelGrid weekLabels={d.week_labels} subjects={d.subjects} />
      </Card>
      <InsightCards attention={d.insights.attention} positive={d.insights.positive} />
    </div>
  )
}

function JourneyTab({ childId }: { childId: string }) {
  const q = useQuery({
    queryKey: parentKeys.fullJourney(childId),
    queryFn: () => getFullJourney(childId),
  })
  if (q.isPending) return <LoadingState />
  if (q.isError)
    return <ErrorState title="Couldn't load the journey" error={q.error} onRetry={() => q.refetch()} />
  const d = q.data
  const insights = d.insights ?? []
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Weeks tracked" value={String(d.summary_stats.weeks_tracked)} />
        <StatCard label="Levels gained" value={String(d.summary_stats.levels_gained ?? 0)} />
        <StatCard
          label="Current standing"
          value={d.summary_stats.current_avg_display ?? 'Just starting'}
        />
      </div>
      <Card className="p-6">
        <h2 className="mb-4 text-base font-semibold text-ink">The whole journey</h2>
        <WeekLevelGrid weekLabels={d.week_labels} subjects={d.subjects} />
      </Card>
      <InsightCards
        attention={insights.filter((i) => i.type === 'attention')}
        positive={insights.filter((i) => i.type === 'positive')}
      />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-ink">{value}</p>
    </Card>
  )
}
