import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/icons'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { ReadinessChip } from '../../components/teacher/ReadinessChip'
import { ShareActions } from '../../components/parent/ShareActions'
import { parentKeys } from '../../components/parent/hooks'
import {
  getPerformanceCard,
  getSubjectSummary,
  getTopicMovement,
  type BehavioralObservation,
  type SubjectSummaryEntry,
  type TopicMovement,
} from '../../lib/api/parent'

const STATUS_TONE: Record<string, 'success' | 'accent' | 'neutral'> = { green: 'success', yellow: 'accent', red: 'neutral' }
const GROUP_WORD: Record<string, string> = {
  confident: 'Confident',
  practicing: 'Practising',
  needs_help: 'Needs a hand',
  not_started: 'Not started yet',
}
const CATEGORY_WORD: Record<string, string> = { confident: 'confident', improving: 'improving', needs_help: 'needs a hand' }

function readinessWord(s: SubjectSummaryEntry): string {
  return s.readiness_level_display ?? GROUP_WORD[s.readiness_group] ?? s.readiness_group
}

function Observations({ items }: { items?: BehavioralObservation[] }) {
  if (!items?.length) return null
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {items.slice(0, 4).map((o, i) => (
        <li key={i}>
          <Badge tone={STATUS_TONE[o.status] ?? 'neutral'}>{o.text}</Badge>
        </li>
      ))}
    </ul>
  )
}

function TopicLists({ s }: { s: SubjectSummaryEntry }) {
  const groups: [string, string[]][] = [
    ['Confident', s.topic_breakdown.confident],
    ['Improving', s.topic_breakdown.improving],
    ['Needs a hand', s.topic_breakdown.needs_help],
  ]
  if (!groups.some(([, t]) => t.length)) return null
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-3">
      {groups.map(([label, topics]) => (
        <div key={label}>
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{label}</p>
          {topics.length ? (
            <ul className="mt-1 space-y-0.5 text-sm text-ink-soft">
              {topics.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">—</p>
          )}
        </div>
      ))}
    </div>
  )
}

function Movements({ items }: { items?: TopicMovement[] }) {
  if (!items?.length) return null
  return (
    <ul className="mt-3 space-y-1 text-sm" data-testid="topic-movement">
      {items.map((m, i) => (
        <li key={i} className="text-ink-soft">
          <span className="font-medium text-ink">{m.topic}</span>: {CATEGORY_WORD[m.from_category] ?? m.from_category} →{' '}
          {CATEGORY_WORD[m.to_category] ?? m.to_category}
        </li>
      ))}
    </ul>
  )
}

function useSubjects(childId: string) {
  const summary = useQuery({ queryKey: parentKeys.subjectSummary(childId), queryFn: () => getSubjectSummary(childId) })
  const movement = useQuery({ queryKey: parentKeys.topicMovement(childId), queryFn: () => getTopicMovement(childId) })
  return { summary, movements: movement.data?.movements ?? {} }
}

export function SubjectsTab({ childId }: { childId: string }) {
  const { summary, movements } = useSubjects(childId)
  if (summary.isPending) return <LoadingState />
  if (summary.isError) return <ErrorState title="Couldn't load subjects" error={summary.error} onRetry={() => summary.refetch()} />
  const d = summary.data
  if (!d.subjects.length) return <EmptyState icon="book" title="No practice yet" description="Subjects appear here after the first test." />
  return (
    <div className="space-y-4" data-testid="subjects-tab">
      {d.subjects.map((s) => (
        <Card key={s.name} className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">{s.icon}</span>
              <div>
                <h3 className="text-base font-semibold text-ink">{s.name}</h3>
                <p className="text-xs text-ink-muted">
                  {s.worksheets_done}/{s.worksheets_total} tests · {s.session_count} sessions
                </p>
              </div>
            </div>
            {s.readiness_level ? (
              <ReadinessChip level={s.readiness_level} display={readinessWord(s)} />
            ) : (
              <Badge tone="neutral">{readinessWord(s)}</Badge>
            )}
          </div>
          {s.insight && <p className="mt-3 text-sm leading-relaxed text-ink-soft">{s.insight}</p>}
          <Observations items={s.behavioral_observations} />
          <Movements items={movements[s.name]} />
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
            <Link to={`/parent/children/${childId}/subjects/${encodeURIComponent(s.name)}`} className="text-primary hover:text-primary-light">
              Details
            </Link>
            <Link to={`/parent/children/${childId}/activity?subject=${encodeURIComponent(s.name)}`} className="text-primary hover:text-primary-light">
              Activity
            </Link>
          </div>
        </Card>
      ))}
    </div>
  )
}

export function SubjectDetailPage() {
  const { childId = '', subject = '' } = useParams()
  const name = decodeURIComponent(subject)
  const { summary, movements } = useSubjects(childId)
  if (summary.isPending) return <LoadingState />
  if (summary.isError) return <ErrorState title="Couldn't load this subject" error={summary.error} onRetry={() => summary.refetch()} />
  const s = summary.data.subjects.find((x) => x.name === name)
  if (!s) return <EmptyState icon="book" title="No practice in this subject yet" />
  const weeks = s.weekly_progress.filter((w) => w.sessions > 0 || w.questions > 0)
  return (
    <div className="mx-auto max-w-2xl space-y-6" data-testid="subject-detail">
      <Link to={`/parent/children/${childId}`} className="inline-flex h-10 items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-light">
        <Icon name="arrow-left" className="h-4 w-4" />
        {summary.data.child_first_name}
      </Link>
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden="true">{s.icon}</span>
            <h1 className="text-2xl font-bold text-ink">{s.name}</h1>
          </div>
          {s.readiness_level ? <ReadinessChip level={s.readiness_level} display={readinessWord(s)} /> : <Badge tone="neutral">{readinessWord(s)}</Badge>}
        </div>
        {s.insight && <p className="mt-3 text-sm leading-relaxed text-ink-soft">{s.insight}</p>}
        <Observations items={s.behavioral_observations} />
      </Card>
      <Card className="p-6">
        <h2 className="text-base font-semibold text-ink">Topics</h2>
        <TopicLists s={s} />
        <Movements items={movements[s.name]} />
      </Card>
      <Card className="p-6">
        <h2 className="text-base font-semibold text-ink">Practice by week</h2>
        {weeks.length ? (
          <ul className="mt-3 divide-y divide-slate-100">
            {weeks.map((w) => (
              <li key={w.week} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink">Week {w.week}</span>
                <span className="text-ink-muted">
                  {w.sessions} session{w.sessions === 1 ? '' : 's'} · {w.questions} questions
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-muted">No sessions in this period.</p>
        )}
      </Card>
      <div className="flex flex-wrap gap-3 text-sm font-medium">
        <Link to={`/parent/children/${childId}/activity?subject=${encodeURIComponent(s.name)}`} className="text-primary hover:text-primary-light">
          Activity feed
        </Link>
        <Link to={`/parent/children/${childId}/engagement`} className="text-primary hover:text-primary-light">
          Engagement
        </Link>
      </div>
    </div>
  )
}

export function PerformanceCardPage() {
  const { childId = '' } = useParams()
  const q = useQuery({ queryKey: parentKeys.performanceCard(childId), queryFn: () => getPerformanceCard(childId) })
  if (q.isPending) return <LoadingState />
  if (q.isError) return <ErrorState title="Couldn't load the card" error={q.error} onRetry={() => q.refetch()} />
  const d = q.data
  const text = `${d.child_name} on Confiddo: ${d.level_name}, ${d.current_streak}-day streak, ${d.tests_completed} of ${d.total_tests} tests done, ${d.practice_days_this_month} practice days this month. Best subject: ${d.best_subject}. 🌱`
  return (
    <div className="mx-auto max-w-xl space-y-6" data-testid="performance-card">
      <Link to={`/parent/children/${childId}`} className="inline-flex h-10 items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-light">
        <Icon name="arrow-left" className="h-4 w-4" />
        Back
      </Link>
      <Card className="bg-navy p-6 text-white">
        <p className="text-xs font-semibold tracking-[0.2em] text-white/70 uppercase">Confiddo</p>
        <h1 className="mt-2 text-2xl font-extrabold">{d.child_name}</h1>
        <p className="text-sm text-white/70">
          Class {d.class_grade}
          {d.school_name ? ` · ${d.school_name}` : ''}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 text-center">
          {[
            ['Level', d.level_name],
            ['Streak', `${d.current_streak} days`],
            ['Tests', `${d.tests_completed} of ${d.total_tests}`],
            ['Practice days', `${d.practice_days_this_month} this month`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-white/10 p-3">
              <p className="text-base font-bold">{value}</p>
              <p className="text-[11px] text-white/70">{label}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm">
          Best subject: <span className="font-semibold">{d.best_subject}</span> · Persistence:{' '}
          <span className="font-semibold">{d.persistence_level}</span>
        </p>
        {d.subjects_practiced.length > 0 && <p className="mt-1 text-xs text-white/70">Practising {d.subjects_practiced.join(', ')}</p>}
      </Card>
      <ShareActions text={text} />
    </div>
  )
}
