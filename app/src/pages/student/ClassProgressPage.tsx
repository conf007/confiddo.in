/**
 * /student/class-progress
 *
 * FEATURE FLAG: VITE_ENABLE_CLASS_RANKINGS (default OFF).
 * GET /student/class-rankings exists (backend/app/api/student.py:176-227) but
 * returns a NAMED XP leaderboard, which conflicts with the product's
 * "no peer comparison" privacy stance — an open product question
 * (ARCHITECTURE.md §6.3/§9.1). Until product decides:
 *   - flag OFF (default): self-progress "your journey" view, no peer data
 *     is even fetched;
 *   - flag ON (`VITE_ENABLE_CLASS_RANKINGS=true` in .env): the XP-only
 *     leaderboard renders (XP, not scores), current student highlighted.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/icons'
import { Spinner } from '../../components/ui/Spinner'
import { CharacterAvatar } from '../../components/student/CharacterAvatar'
import { ProgressBar } from '../../components/student/ProgressBar'
import {
  studentKeys,
  useGamificationQuery,
} from '../../components/student/hooks'
import {
  CLASS_RANKINGS_ENABLED,
  getClassRankings,
} from '../../lib/api/student'
import { friendlyError } from '../../lib/api/errors'
import { nextLevelPoints, LEVEL_THRESHOLDS } from '../../lib/parity'

export function ClassProgressPage() {
  return CLASS_RANKINGS_ENABLED ? <RankingsView /> : <JourneyView />
}

// ── Default: self-progress framing (no peer data fetched) ────────────

function JourneyView() {
  const gamification = useGamificationQuery()

  if (gamification.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }
  const g = gamification.data
  if (!g) {
    return (
      <EmptyState
        icon="users"
        title="We couldn't load your journey"
        description={friendlyError(gamification.error)}
        action={
          <Button variant="secondary" onClick={() => gamification.refetch()}>
            Try again
          </Button>
        }
      />
    )
  }

  const next = nextLevelPoints(g.total_points)
  const currentFloor = LEVEL_THRESHOLDS[g.level] ?? 0
  const levelProgress =
    next === null ? 1 : (g.total_points - currentFloor) / (next - currentFloor)

  const stats = [
    { label: 'Tests completed', value: g.total_tests_completed },
    { label: 'Practice days', value: g.total_practice_days },
    { label: 'Active weeks', value: g.weeks_with_activity },
    { label: 'Perfect tests', value: g.perfect_test_count },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Your journey</h1>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          The only comparison that matters is you, last week vs you, this
          week. Here's how far you've come.
        </p>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
              Level
            </p>
            <p className="text-lg font-semibold text-ink">{g.level_name}</p>
          </div>
          <Badge tone="accent">
            <Icon name="flame" className="h-3.5 w-3.5" />
            {g.total_points.toLocaleString()} XP
          </Badge>
        </div>
        <ProgressBar value={levelProgress} tone="primary" label="Level progress" />
        <p className="mt-2 text-center text-xs text-ink-muted">
          {next === null
            ? 'Top level — Galaxy Master!'
            : `${(next - g.total_points).toLocaleString()} XP to the next level`}
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="text-center">
            <p className="text-2xl font-bold text-ink">{s.value}</p>
            <p className="mt-1 text-xs text-ink-muted">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-tint text-accent">
          <Icon name="flame" className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">
            {g.current_streak > 0
              ? `${g.current_streak}-day streak going`
              : 'Start a new streak today'}
          </p>
          <p className="text-xs text-ink-muted">
            Longest so far: {g.longest_streak} day{g.longest_streak === 1 ? '' : 's'}
          </p>
        </div>
      </Card>

      <div className="text-center">
        <Link
          to="/student/progress"
          className="inline-flex h-12 items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-light"
        >
          See your full progress
        </Link>
      </div>
    </div>
  )
}

// ── Flag ON: XP-only leaderboard (open product question, §9.1) ────────

function RankingsView() {
  const rankings = useQuery({
    queryKey: studentKeys.rankings,
    queryFn: getClassRankings,
  })

  if (rankings.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }
  const data = rankings.data
  if (!data) {
    return (
      <EmptyState
        icon="users"
        title="We couldn't load your class right now"
        description={friendlyError(rankings.error)}
        action={
          <Button variant="secondary" onClick={() => rankings.refetch()}>
            Try again
          </Button>
        }
      />
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Class progress</h1>
        <p className="mt-1 text-sm text-ink-muted">
          XP from effort and practice — this is about showing up, not marks.
          You're #{data.user_rank} of {data.total_students}.
        </p>
      </div>

      <Card padded={false} className="divide-y divide-slate-100">
        {data.rankings.map((entry) => (
          <div
            key={entry.student_id}
            className={[
              'flex items-center gap-3 px-4 py-3 sm:px-6',
              entry.is_current_user ? 'bg-primary-tint/60' : '',
            ].join(' ')}
          >
            <span className="w-8 shrink-0 text-center text-sm font-semibold text-ink-muted">
              {entry.rank}
            </span>
            <CharacterAvatar
              characterId={entry.character}
              sizeClassName="h-10 w-10 text-base"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {entry.name}
                {entry.is_current_user && (
                  <span className="ml-1.5 text-xs font-semibold text-primary">(you)</span>
                )}
              </p>
              {entry.current_streak > 0 && (
                <p className="flex items-center gap-1 text-xs text-ink-muted">
                  <Icon name="flame" className="h-3 w-3 text-accent" />
                  {entry.current_streak}-day streak
                </p>
              )}
            </div>
            <span className="shrink-0 text-sm font-semibold text-accent">
              {entry.total_points.toLocaleString()} XP
            </span>
          </div>
        ))}
      </Card>
    </div>
  )
}
