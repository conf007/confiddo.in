/**
 * My Badges — 16 badges derived client-side from gamification stats,
 * mirroring frontend/lib/presentation/screens/home/my_badges_screen.dart:
 * 4 categories × 4 tiers (shown as numerals I–IV), thresholds verbatim.
 * Earned vs locked follows the design system: one hue family + muted grays.
 */
import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../../components/icons'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { friendlyError } from '../../lib/api/errors'
import type { GamificationData } from '../../lib/api/student'
import { useGamificationQuery } from '../../components/student/hooks'

const TIER_NUMERALS = ['I', 'II', 'III', 'IV'] as const
type Tier = 0 | 1 | 2 | 3 // Bronze, Silver, Gold, Platinum

interface BadgeDef {
  id: string
  name: string
  tier: Tier
  icon: IconName
  /** Short, encouraging description of how it's earned. */
  hint: string
  threshold: number
  value: (g: GamificationData) => number
}

interface BadgeCategory {
  title: string
  caption: string
  badges: BadgeDef[]
}

// Thresholds from my_badges_screen.dart — do not tweak.
const CATEGORIES: BadgeCategory[] = [
  {
    title: 'Consistency',
    caption: 'Showing up is a superpower',
    badges: [
      ['week-1', 'Week 1', 1, 'Practice in 1 week'],
      ['month-strong', 'Month Strong', 4, 'Practice in 4 different weeks'],
      ['quarterly', 'Quarterly', 12, 'Practice in 12 different weeks'],
      ['semester', 'Semester', 24, 'Practice in 24 different weeks'],
    ].map(([id, name, threshold, hint], i) => ({
      id: id as string,
      name: name as string,
      tier: i as Tier,
      icon: 'clipboard' as IconName,
      hint: hint as string,
      threshold: threshold as number,
      value: (g: GamificationData) => g.weeks_with_activity,
    })),
  },
  {
    title: 'XP Milestones',
    caption: 'Every question counts',
    badges: [
      ['rising-star', 'Rising Star', 50, 'Earn 50 XP'],
      ['super-nova', 'Super Nova', 200, 'Earn 200 XP'],
      ['blazing-pro', 'Blazing Pro', 500, 'Earn 500 XP'],
      ['galaxy-master', 'Galaxy Master', 1000, 'Earn 1000 XP'],
    ].map(([id, name, threshold, hint], i) => ({
      id: id as string,
      name: name as string,
      tier: i as Tier,
      icon: 'sparkles' as IconName,
      hint: hint as string,
      threshold: threshold as number,
      value: (g: GamificationData) => g.total_points,
    })),
  },
  {
    title: 'Streaks',
    caption: 'Little and often beats all-at-once',
    badges: [
      ['streak-3', '3 Days', 3, 'Practice 3 days in a row'],
      ['streak-7', '7 Days', 7, 'Practice 7 days in a row'],
      ['streak-14', '14 Days', 14, 'Practice 14 days in a row'],
      ['streak-30', '30 Days', 30, 'Practice 30 days in a row'],
    ].map(([id, name, threshold, hint], i) => ({
      id: id as string,
      name: name as string,
      tier: i as Tier,
      icon: 'flame' as IconName,
      hint: hint as string,
      threshold: threshold as number,
      value: (g: GamificationData) => g.longest_streak,
    })),
  },
  {
    title: 'Mastery',
    caption: 'Practice makes progress',
    badges: [
      {
        id: 'tests-5',
        name: '5 Tests',
        tier: 0 as Tier,
        icon: 'medal' as IconName,
        hint: 'Complete 5 tests',
        threshold: 5,
        value: (g: GamificationData) => g.total_tests_completed,
      },
      {
        id: 'tests-15',
        name: '15 Tests',
        tier: 1 as Tier,
        icon: 'medal' as IconName,
        hint: 'Complete 15 tests',
        threshold: 15,
        value: (g: GamificationData) => g.total_tests_completed,
      },
      {
        id: 'perfect-3',
        name: '3 Perfect',
        tier: 2 as Tier,
        icon: 'medal' as IconName,
        hint: 'Get 3 perfect tests',
        threshold: 3,
        value: (g: GamificationData) => g.perfect_test_count,
      },
      {
        id: 'perfect-10',
        name: '10 Perfect',
        tier: 3 as Tier,
        icon: 'medal' as IconName,
        hint: 'Get 10 perfect tests',
        threshold: 10,
        value: (g: GamificationData) => g.perfect_test_count,
      },
    ],
  },
]

function BadgeCard({ badge, g }: { badge: BadgeDef; g: GamificationData }) {
  const current = badge.value(g)
  const earned = current >= badge.threshold
  const progress = Math.min(1, current / badge.threshold)

  return (
    <Card
      className={[
        'flex flex-col items-center gap-2 p-4 text-center transition-colors',
        earned ? '' : 'bg-slate-50',
      ].join(' ')}
      aria-label={`${badge.name} — ${earned ? 'earned' : 'locked'}`}
    >
      <div
        className={[
          'relative flex h-14 w-14 items-center justify-center rounded-full',
          earned ? 'bg-primary-tint text-primary' : 'bg-slate-100 text-slate-400',
        ].join(' ')}
      >
        <Icon name={earned ? badge.icon : 'lock'} className="h-6 w-6" />
        <span
          className={[
            'absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold',
            earned ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500',
          ].join(' ')}
        >
          {TIER_NUMERALS[badge.tier]}
        </span>
      </div>
      <p className={`text-sm font-semibold ${earned ? 'text-ink' : 'text-ink-muted'}`}>
        {badge.name}
      </p>
      <p className="text-xs leading-relaxed text-ink-muted">{badge.hint}</p>
      {!earned && (
        <div className="mt-auto w-full">
          <div
            className="h-1 w-full overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {/* Neutral gray fill on locked items per design system */}
            <div
              className="h-full rounded-full bg-slate-400"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-ink-muted">
            {current} / {badge.threshold}
          </p>
        </div>
      )}
    </Card>
  )
}

export function BadgesPage() {
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
        icon="medal"
        title="We couldn't load your badges"
        description={friendlyError(gamification.error)}
        action={
          <Button variant="secondary" onClick={() => gamification.refetch()}>
            Try again
          </Button>
        }
      />
    )
  }

  const earnedCount = CATEGORIES.flatMap((c) => c.badges).filter(
    (b) => b.value(g) >= b.threshold,
  ).length

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">My badges</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {earnedCount} of 16 earned — each one is yours to keep.
          </p>
        </div>
        <Link
          to="/student/progress"
          className="text-sm font-medium text-primary hover:underline"
        >
          View progress
        </Link>
      </div>

      {CATEGORIES.map((category) => (
        <section key={category.title} aria-label={category.title}>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-ink">{category.title}</h2>
            <p className="text-xs text-ink-muted">{category.caption}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {category.badges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} g={g} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
