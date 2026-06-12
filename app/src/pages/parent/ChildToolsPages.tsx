/**
 * Per-child tool pages: activity feed, engagement, conversation starters
 * and home goals. Warm, effort-not-marks rendering throughout (§6.3).
 */
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Icon } from '../../components/icons'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { ChildPageHeader } from '../../components/parent/ChildPageHeader'
import { parentKeys } from '../../components/parent/hooks'
import { formatDay } from '../../components/parent/format'
import {
  createHomeGoal,
  getActivityFeed,
  getConversationStarters,
  getEngagement,
  getHomeGoals,
  markStarterAsked,
  updateHomeGoal,
  type BehavioralObservation,
  type GoalType,
  type HomeGoal,
} from '../../lib/api/parent'
import { friendlyError } from '../../lib/api/errors'

const STATUS_TONE: Record<string, 'success' | 'gold' | 'accent'> = {
  green: 'success',
  yellow: 'gold',
  red: 'accent',
}

function Observations({ items }: { items: BehavioralObservation[] }) {
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

// ── Activity feed ─────────────────────────────────────────────────────

const SUBJECTS = ['All', 'Mathematics', 'Science', 'English', 'Hindi']

export function ActivityFeedPage() {
  const { childId = '' } = useParams()
  const [subject, setSubject] = useState<string>()
  const q = useQuery({
    queryKey: parentKeys.activityFeed(childId, subject),
    queryFn: () => getActivityFeed(childId, subject),
  })

  return (
    <div className="space-y-6">
      <ChildPageHeader
        childId={childId}
        title="Activity Feed"
        subtitle="The day-by-day practice story — effort first, always."
      />
      <div className="flex flex-wrap gap-2">
        {SUBJECTS.map((s) => {
          const value = s === 'All' ? undefined : s
          const active = subject === value
          return (
            <button
              key={s}
              onClick={() => setSubject(value)}
              className={[
                'h-10 rounded-full px-4 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-white'
                  : 'bg-card text-ink-soft shadow-soft hover:bg-primary-tint',
              ].join(' ')}
            >
              {s}
            </button>
          )
        })}
      </div>
      {q.isPending ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState title="Couldn't load the feed" error={q.error} onRetry={() => q.refetch()} />
      ) : q.data.items.length === 0 ? (
        <EmptyState
          icon="clipboard"
          title="No practice recorded yet"
          description="When practice sessions happen, the story shows up here."
        />
      ) : (
        <ol className="space-y-4">
          {q.data.items.map((item, i) => (
            <li key={i}>
              <Card className="p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-ink">{item.test_title}</h3>
                  <span className="text-xs text-ink-muted">{formatDay(item.date)}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.narrative}</p>
                <p className="mt-2 text-xs text-ink-muted">
                  {item.sessions_count} session{item.sessions_count === 1 ? '' : 's'} ·{' '}
                  {item.questions_practiced} questions
                  {item.topics.length > 0 && <> · {item.topics.join(', ')}</>}
                </p>
                <Observations items={item.behavioral_highlights} />
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

// ── Engagement ────────────────────────────────────────────────────────

export function EngagementPage() {
  const { childId = '' } = useParams()
  const q = useQuery({
    queryKey: parentKeys.engagement(childId),
    queryFn: () => getEngagement(childId),
  })
  if (q.isPending) return <LoadingState />
  if (q.isError)
    return <ErrorState title="Couldn't load engagement" error={q.error} onRetry={() => q.refetch()} />
  const d = q.data
  const ringPct = Math.min(100, (d.engagement_ring.done / Math.max(1, d.engagement_ring.goal)) * 100)

  return (
    <div className="space-y-6">
      <ChildPageHeader
        childId={childId}
        title="Engagement"
        subtitle={`How ${d.child_first_name}'s practice rhythm is going.`}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-medium text-ink-muted">This week</p>
          <p className="mt-1 text-xl font-bold text-ink">
            {d.engagement_ring.done}
            <span className="text-sm font-medium text-ink-muted"> / {d.engagement_ring.goal} sessions</span>
          </p>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-primary" style={{ width: `${ringPct}%` }} />
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-ink-muted">Current streak</p>
          <p className="mt-1 flex items-center gap-1.5 text-xl font-bold text-ink">
            <Icon name="flame" className="h-5 w-5 text-accent" />
            {d.current_streak} day{d.current_streak === 1 ? '' : 's'}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-ink-muted">Practice days</p>
          <p className="mt-1 text-xl font-bold text-ink">{d.total_practice_days}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-ink-muted">Persistence</p>
          <p className="mt-1 text-xl font-bold text-ink">{d.persistence_level}</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-base font-semibold text-ink">Last 30 days</h2>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {d.streak_calendar.map((day) => (
            <span
              key={day.date}
              title={`${formatDay(day.date)}${day.active ? ' — practiced' : ''}`}
              className={[
                'h-5 w-5 rounded-md',
                day.active ? 'bg-success' : 'bg-slate-100',
              ].join(' ')}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          Each square is a day — green means at least one practice session.
        </p>
      </Card>

      {d.weekly_sessions.length > 0 && (
        <Card className="p-6">
          <h2 className="text-base font-semibold text-ink">Sessions per week</h2>
          <div className="mt-4 flex items-end gap-3" style={{ height: 120 }}>
            {d.weekly_sessions.map((w, i) => {
              const max = Math.max(1, ...d.weekly_sessions.map((x) => x.count))
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className="w-full max-w-10 rounded-t-lg bg-primary/80"
                    style={{ height: `${(w.count / max) * 100}%`, minHeight: w.count > 0 ? 6 : 2 }}
                  />
                  <span className="text-[10px] text-ink-muted">{w.week_label}</span>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

// ── Conversation starters ─────────────────────────────────────────────

export function StartersPage() {
  const { childId = '' } = useParams()
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: parentKeys.starters(childId),
    queryFn: () => getConversationStarters(childId),
  })
  const asked = useMutation({
    mutationFn: markStarterAsked,
    onSuccess: () => qc.invalidateQueries({ queryKey: parentKeys.starters(childId) }),
  })

  if (q.isPending) return <LoadingState />
  if (q.isError)
    return <ErrorState title="Couldn't load starters" error={q.error} onRetry={() => q.refetch()} />
  const d = q.data

  return (
    <div className="space-y-6">
      <ChildPageHeader
        childId={childId}
        title="Conversation Starters"
        subtitle="One gentle question a day — about learning, never about marks."
      />
      <Card className="border-l-4 border-primary p-6">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">Today</p>
        <p className="mt-2 text-lg leading-relaxed font-medium text-ink">
          “{d.today.question_text}”
        </p>
        <div className="mt-4">
          {d.today.was_asked ? (
            <Badge tone="success">
              <Icon name="check" className="h-3.5 w-3.5" /> Asked
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              loading={asked.isPending}
              onClick={() => asked.mutate(d.today.id)}
            >
              I asked this
            </Button>
          )}
        </div>
      </Card>
      {d.history.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-muted uppercase">
            Earlier questions
          </h2>
          <ul className="space-y-3">
            {d.history.map((h) => (
              <li key={h.id}>
                <Card className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm text-ink-soft">“{h.question_text}”</p>
                    <p className="mt-1 text-xs text-ink-muted">{formatDay(h.date)}</p>
                  </div>
                  {h.was_asked && <Badge tone="success">Asked</Badge>}
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

// ── Home goals ────────────────────────────────────────────────────────

const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: 'practice_days', label: 'Practice days' },
  { value: 'session_count', label: 'Sessions' },
  { value: 'custom', label: 'Custom' },
]

export function GoalsPage() {
  const { childId = '' } = useParams()
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: parentKeys.goals(childId),
    queryFn: () => getHomeGoals(childId),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: parentKeys.goals(childId) })
  const create = useMutation({
    mutationFn: (input: { goal_text: string; goal_type: GoalType; target_value: number }) =>
      createHomeGoal(childId, input),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: ({ id, ...patch }: { id: string; current_value?: number; is_completed?: boolean }) =>
      updateHomeGoal(id, patch),
    onSuccess: invalidate,
  })

  const [text, setText] = useState('')
  const [type, setType] = useState<GoalType>('practice_days')
  const [target, setTarget] = useState(3)

  if (q.isPending) return <LoadingState />
  if (q.isError)
    return <ErrorState title="Couldn't load goals" error={q.error} onRetry={() => q.refetch()} />
  const d = q.data

  return (
    <div className="space-y-6">
      <ChildPageHeader
        childId={childId}
        title="Home Goals"
        subtitle="Small, kind goals for the week — effort over outcomes."
      />

      <Card className="p-6">
        <h2 className="text-base font-semibold text-ink">Add a goal for this week</h2>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]"
          onSubmit={(e) => {
            e.preventDefault()
            if (!text.trim()) return
            create.mutate(
              { goal_text: text.trim(), goal_type: type, target_value: Math.max(1, target) },
              { onSuccess: () => setText('') },
            )
          }}
        >
          <Input
            placeholder="e.g. Practice 3 days this week"
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
          <select
            aria-label="Goal type"
            className="h-12 rounded-xl border border-slate-200 bg-card px-3 text-sm text-ink"
            value={type}
            onChange={(e) => setType(e.target.value as GoalType)}
          >
            {GOAL_TYPES.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
          <Input
            aria-label="Target"
            type="number"
            min={1}
            max={50}
            className="w-24"
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
          />
          <Button type="submit" loading={create.isPending}>
            Add goal
          </Button>
        </form>
        {create.isError && (
          <p className="mt-2 text-sm text-band-red">{friendlyError(create.error)}</p>
        )}
      </Card>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-muted uppercase">
          This week
        </h2>
        {d.current_week.length === 0 ? (
          <EmptyState
            icon="check"
            title="No goals yet this week"
            description="One small goal is a lovely place to start."
          />
        ) : (
          <ul className="space-y-3">
            {d.current_week.map((g) => (
              <GoalRow
                key={g.id}
                goal={g}
                busy={update.isPending}
                onStep={() =>
                  update.mutate({ id: g.id, current_value: g.current_value + 1 })
                }
                onComplete={() => update.mutate({ id: g.id, is_completed: true })}
              />
            ))}
          </ul>
        )}
      </section>

      {d.past_weeks.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-muted uppercase">
            Past weeks
          </h2>
          <div className="space-y-4">
            {d.past_weeks.map((w) => (
              <Card key={w.week_start} className="p-5">
                <p className="text-xs font-medium text-ink-muted">
                  Week of {formatDay(w.week_start)}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {w.goals.map((g) => (
                    <li key={g.id} className="flex items-center gap-2 text-sm text-ink-soft">
                      <Icon
                        name={g.is_completed ? 'check' : 'close'}
                        className={`h-4 w-4 ${g.is_completed ? 'text-success' : 'text-ink-muted'}`}
                      />
                      {g.goal_text}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function GoalRow({
  goal,
  busy,
  onStep,
  onComplete,
}: {
  goal: HomeGoal
  busy: boolean
  onStep: () => void
  onComplete: () => void
}) {
  const pct = Math.min(100, (goal.current_value / Math.max(1, goal.target_value)) * 100)
  return (
    <li>
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={`text-sm font-medium ${goal.is_completed ? 'text-ink-muted line-through' : 'text-ink'}`}>
            {goal.goal_text}
          </p>
          {goal.is_completed ? (
            <Badge tone="success">
              <Icon name="check" className="h-3.5 w-3.5" /> Done
            </Badge>
          ) : (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" disabled={busy} onClick={onStep}>
                +1 progress
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={onComplete}>
                Mark done
              </Button>
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${goal.is_completed ? 'bg-success' : 'bg-primary'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-ink-muted">
            {goal.current_value} / {goal.target_value}
          </span>
        </div>
      </Card>
    </li>
  )
}
