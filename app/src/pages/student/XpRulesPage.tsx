/**
 * /student/xp-rules — "How to earn XP" explainer.
 *
 * Values match the BACKEND (gamification_service.py:28-54), not the Flutter
 * explainer where they disagree (ARCHITECTURE.md §9.3/§9.4):
 *   - curiosity bonus is +1 (Flutter explainer wrongly says +3)
 *   - app switches: first -2, each additional -3 (Flutter says flat -2)
 */
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Icon, type IconName } from '../../components/icons'
import {
  LEVEL_NAMES,
  LEVEL_THRESHOLDS,
  XP_COMEBACK,
  XP_CORRECT_NO_HINT,
  XP_CORRECT_WITH_HINT,
  XP_CURIOSITY_BONUS,
  XP_FIRST_TODAY,
  XP_REVIEW,
  XP_SKIP_PENALTY,
  XP_TEST_COMPLETED,
  XP_WRONG_GAVE_UP,
  XP_WRONG_PERSISTED,
} from '../../lib/parity'

interface RuleRow {
  label: string
  detail: string
  points: number
  /** show as 'free' instead of +0 */
  zeroIsNeutral?: boolean
}

const EARN_RULES: RuleRow[] = [
  { label: 'Correct answer (no hint)', detail: 'Solving it on your own', points: XP_CORRECT_NO_HINT },
  { label: 'Correct answer (with hint)', detail: 'Hints teach approach — still a win', points: XP_CORRECT_WITH_HINT },
  { label: 'Wrong, but you tried again', detail: 'Persistence counts more than perfection', points: XP_WRONG_PERSISTED },
  { label: 'Wrong, then saw the solution', detail: 'Learning from the solution is okay', points: XP_WRONG_GAVE_UP, zeroIsNeutral: true },
  { label: 'Curious learner', detail: 'Reading the solution after a correct answer', points: XP_CURIOSITY_BONUS },
  { label: 'Finishing the whole test', detail: 'Every question attempted', points: XP_TEST_COMPLETED },
  { label: 'First test of the day', detail: 'Showing up matters', points: XP_FIRST_TODAY },
  { label: 'Comeback bonus', detail: 'Returning after 3+ days away', points: XP_COMEBACK },
  { label: 'Reviewing in revision mode', detail: 'Per question revisited (once a week)', points: XP_REVIEW },
]

const CARE_RULES: RuleRow[] = [
  { label: 'Skipping a question', detail: 'Per question left unanswered', points: XP_SKIP_PENALTY },
  { label: 'Skipped or wrong without review', detail: 'Per question, only if you skip the review step', points: -1 },
  { label: 'Leaving the test (over 30 seconds)', detail: 'First time -2, then -3 each — stay with it', points: -2 },
]

const BOOSTS: { icon: IconName; title: string; detail: string }[] = [
  {
    icon: 'flame',
    title: '7-day streak = 1.5x',
    detail: 'Practice 7 days in a row and your session XP gets a half-again bonus.',
  },
  {
    icon: 'chart',
    title: 'Quality multiplier',
    detail:
      'Thoughtful work earns more: your session XP is scaled by how ready your practice shows you are (0.5x to 1.5x).',
  },
]

function PointsPill({ points, zeroIsNeutral }: { points: number; zeroIsNeutral?: boolean }) {
  if (points === 0 && zeroIsNeutral) {
    return (
      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-ink-muted">
        +0
      </span>
    )
  }
  const positive = points > 0
  return (
    <span
      className={[
        'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
        positive ? 'bg-accent-tint text-accent' : 'bg-slate-100 text-ink-soft',
      ].join(' ')}
    >
      {positive ? `+${points}` : points} XP
    </span>
  )
}

function RuleList({ rules }: { rules: RuleRow[] }) {
  return (
    <ul className="divide-y divide-slate-100">
      {rules.map((rule) => (
        <li key={rule.label} className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">{rule.label}</p>
            <p className="text-xs text-ink-muted">{rule.detail}</p>
          </div>
          <PointsPill points={rule.points} zeroIsNeutral={rule.zeroIsNeutral} />
        </li>
      ))}
    </ul>
  )
}

export function XpRulesPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          to="/student/progress"
          className="mb-3 inline-flex h-12 items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink-soft"
        >
          <Icon name="arrow-left" className="h-4 w-4" />
          Back to progress
        </Link>
        <h1 className="text-2xl font-bold text-ink">How XP works</h1>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          XP rewards effort and honest practice — trying, persisting and
          reviewing. It is never about marks.
        </p>
      </div>

      <Card>
        <h2 className="mb-2 text-base font-semibold text-ink">Earning XP</h2>
        <RuleList rules={EARN_RULES} />
      </Card>

      <Card>
        <h2 className="mb-2 text-base font-semibold text-ink">Boosts</h2>
        <div className="space-y-4">
          {BOOSTS.map((b) => (
            <div key={b.title} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-tint text-accent">
                <Icon name={b.icon} className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-ink">{b.title}</p>
                <p className="text-xs leading-relaxed text-ink-muted">{b.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 text-base font-semibold text-ink">Worth knowing</h2>
        <p className="mb-2 text-xs leading-relaxed text-ink-muted">
          These are gentle nudges, not punishments — your total XP never drops
          below zero.
        </p>
        <RuleList rules={CARE_RULES} />
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-semibold text-ink">Levels</h2>
        <ul className="space-y-2.5">
          {LEVEL_NAMES.map((name, i) => {
            const from = LEVEL_THRESHOLDS[i]
            const next = LEVEL_THRESHOLDS[i + 1]
            return (
              <li key={name} className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-ink">{name}</span>
                <span className="text-xs text-ink-muted">
                  {next !== undefined ? `${from} – ${next - 1} XP` : `${from}+ XP`}
                </span>
              </li>
            )
          })}
        </ul>
      </Card>

      <p className="pb-4 text-center text-xs text-ink-muted">
        One more thing: redoing the same test in the same week is great
        practice, but XP for it is only earned once.
      </p>
    </div>
  )
}
