/**
 * /student/progress — XP, level + next-level bar, streaks, practice days,
 * readiness ladder (words only, never scores) and self-comparison bars
 * (plain CSS/SVG, no chart lib).
 *
 * Data: GET /student/gamification (the Flutter student_progress_screen uses
 * only the gamification provider too).
 *
 * TODO-parity: there is NO student-facing endpoint exposing the weekly
 * readiness level today (backend computes it for teachers/parents only —
 * teacher_service.get_weekly_student_level). We therefore show the readiness
 * ladder as words for orientation without claiming a current level. If the
 * backend ever exposes it to students, render the word via
 * readinessDisplayName() from src/lib/parity (avoidant -> "Needs
 * Encouragement") — never a number, never a score (ARCHITECTURE.md §6.3).
 */
import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/icons'
import { Spinner } from '../../components/ui/Spinner'
import { ProgressBar } from '../../components/student/ProgressBar'
import { useGamificationQuery } from '../../components/student/hooks'
import { friendlyError } from '../../lib/api/errors'
import {
  LEVEL_NAMES,
  LEVEL_THRESHOLDS,
  READINESS_DISPLAY_NAMES,
  nextLevelPoints,
} from '../../lib/parity'

const READINESS_LADDER = [
  { word: READINESS_DISPLAY_NAMES.avoidant, hint: 'Every journey starts somewhere' },
  { word: READINESS_DISPLAY_NAMES.attempting, hint: 'Showing up and trying' },
  { word: READINESS_DISPLAY_NAMES.practicing, hint: 'Building steady habits' },
  { word: READINESS_DISPLAY_NAMES.confident, hint: 'Trusting what you know' },
  { word: READINESS_DISPLAY_NAMES.competition_ready, hint: 'Ready for any challenge' },
]

/** Self-comparison bar — you vs your own best, never vs anyone else. */
function SelfBar({
  label,
  value,
  max,
  suffix,
}: {
  label: string
  value: number
  max: number
  suffix?: string
}) {
  const safeMax = Math.max(max, value, 1)
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="text-xs text-ink-muted">
          {value}
          {suffix ?? ''}
        </span>
      </div>
      <ProgressBar value={value / safeMax} tone="primary" label={label} />
    </div>
  )
}

export function StudentProgressPage() {
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
        icon="chart"
        title="We couldn't load your progress"
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">My progress</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Your journey, your pace — compared only with yesterday's you.
          </p>
        </div>
        <Link
          to="/student/xp-rules"
          className="inline-flex h-12 items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-light"
        >
          How XP works
        </Link>
      </div>

      {/* Level + XP */}
      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
              Level {g.level + 1} of {LEVEL_NAMES.length}
            </p>
            <p className="text-xl font-bold text-ink">{g.level_name}</p>
          </div>
          <Badge tone="accent" className="text-sm">
            <Icon name="flame" className="h-4 w-4" />
            {g.total_points.toLocaleString()} XP
          </Badge>
        </div>
        <ProgressBar value={levelProgress} tone="accent" label="Progress to next level" />
        <p className="mt-2 text-center text-xs text-ink-muted">
          {next === null
            ? 'Galaxy Master — the very top. Incredible.'
            : `${(next - g.total_points).toLocaleString()} XP to ${LEVEL_NAMES[g.level + 1]}`}
        </p>
      </Card>

      {/* Streaks */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="text-center">
          <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-tint text-accent">
            <Icon name="flame" className="h-5 w-5" />
          </span>
          <p className="text-2xl font-bold text-ink">{g.current_streak}</p>
          <p className="text-xs text-ink-muted">day streak</p>
          {g.current_streak >= 7 && (
            <Badge tone="accent" className="mt-2">
              1.5x XP active!
            </Badge>
          )}
        </Card>
        <Card className="text-center">
          <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-tint text-primary">
            <Icon name="medal" className="h-5 w-5" />
          </span>
          <p className="text-2xl font-bold text-ink">{g.longest_streak}</p>
          <p className="text-xs text-ink-muted">longest streak</p>
        </Card>
      </div>

      {/* Self-comparison bars (CSS only) */}
      <Card>
        <h2 className="mb-4 text-base font-semibold text-ink">You vs your best</h2>
        <div className="space-y-4">
          <SelfBar
            label="Current streak vs longest"
            value={g.current_streak}
            max={g.longest_streak}
            suffix={` / ${g.longest_streak} days`}
          />
          <SelfBar label="Practice days" value={g.total_practice_days} max={30} suffix=" days" />
          <SelfBar label="Active weeks" value={g.weeks_with_activity} max={12} suffix=" weeks" />
          <SelfBar
            label="Tests completed"
            value={g.total_tests_completed}
            max={Math.max(10, g.total_tests_completed)}
          />
        </div>
        {g.perfect_test_count > 0 && (
          <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-soft">
            <Icon name="sparkles" className="h-3.5 w-3.5 text-gold" />
            {g.perfect_test_count} perfect test{g.perfect_test_count === 1 ? '' : 's'} — every
            question right!
          </p>
        )}
      </Card>

      {/* Readiness ladder — words only, never scores (§6.3) */}
      <Card>
        <h2 className="mb-1 text-base font-semibold text-ink">The readiness journey</h2>
        <p className="mb-4 text-xs leading-relaxed text-ink-muted">
          Your teacher sees how ready your practice shows you are — always in
          words, never marks. Here's the whole journey:
        </p>
        <ol className="space-y-2.5">
          {READINESS_LADDER.map((step, i) => (
            <li key={step.word} className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-tint text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{step.word}</p>
                <p className="text-xs text-ink-muted">{step.hint}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link to="/student/badges">
          <Card className="flex h-full items-center gap-3 transition-transform duration-150 hover:-translate-y-0.5">
            <Icon name="medal" className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium text-ink">My badges</span>
          </Card>
        </Link>
        <Link to="/student/characters">
          <Card className="flex h-full items-center gap-3 transition-transform duration-150 hover:-translate-y-0.5">
            <Icon name="sparkles" className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium text-ink">My characters</span>
          </Card>
        </Link>
      </div>
    </div>
  )
}
