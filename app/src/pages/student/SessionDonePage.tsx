/**
 * /student/sessions/:sid/done — completion celebration.
 *
 * Renders the backend's gamification block VERBATIM (the client never
 * computes XP): breakdown[] as a staggered reveal, total XP count-up, streak
 * flame when a streak is alive, level-up moment when level increased, and
 * the is_practice_only "XP already earned this week" state. Per-session
 * total_earned CAN be negative (ARCHITECTURE.md §9.11) — rendered honestly
 * with warm copy. Tasteful CSS transitions only; no confetti libraries.
 */
import { Link, useParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { CountUp } from '../../components/student/CountUp'
import { Icon } from '../../components/icons'
import { loadTracked } from './session/tracker'

export function SessionDonePage() {
  const { sid = '' } = useParams()
  const tracked = loadTracked(sid)
  const completion = tracked?.completion

  if (!completion) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-ink-muted">
          Nothing to celebrate here yet — finish a test and come back!
        </p>
        <Link to="/student" className="mt-4 inline-block">
          <Button variant="secondary">Back to home</Button>
        </Link>
      </div>
    )
  }

  const g = completion.gamification
  const practiceOnly = g.is_practice_only === true
  const leveledUp =
    tracked.prevLevel !== undefined && g.level > tracked.prevLevel
  const reviewPoints = g.review_points_earned ?? 0
  const isRevision = tracked.isRevision

  // Stagger timing: breakdown rows first, then the total counts up.
  const rows = g.breakdown ?? []
  const totalDelay = 300 + rows.length * 160

  return (
    <div className="mx-auto max-w-md space-y-5 pb-8 text-center">
      <style>{`
        @keyframes done-pop { 0% { transform: scale(0.6); opacity: 0 } 70% { transform: scale(1.08) } 100% { transform: scale(1); opacity: 1 } }
        @keyframes done-row { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @media (prefers-reduced-motion: reduce) {
          .done-anim { animation: none !important; opacity: 1 !important }
        }
      `}</style>

      <div
        className="done-anim mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success-tint text-success animate-[done-pop_500ms_ease-out]"
      >
        <Icon name="check" className="h-10 w-10" />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-ink">
          {isRevision
            ? 'Revision complete!'
            : practiceOnly
              ? 'Great practice round!'
              : 'Test complete!'}
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          {completion.message || 'Thank you for practicing today!'}
        </p>
        {tracked.testTitle && (
          <p className="mt-1 text-xs text-ink-muted">
            {tracked.testTitle}
            {tracked.subject ? ` · ${tracked.subject}` : ''}
          </p>
        )}
      </div>

      {practiceOnly ? (
        <Card>
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-tint text-primary">
            <Icon name="sparkles" className="h-6 w-6" />
          </span>
          <p className="text-sm font-semibold text-ink">
            Practice round — XP already earned this week
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            You earned full XP for this test earlier this week. Extra practice
            still makes you sharper — that's the real reward.
          </p>
        </Card>
      ) : (
        <Card className="text-left">
          <p className="mb-3 text-center text-xs font-medium tracking-wide text-ink-muted uppercase">
            XP earned
          </p>
          <ul className="space-y-2">
            {rows.map((row, i) => (
              <li
                key={`${row.label}-${i}`}
                className="done-anim flex items-center justify-between gap-3 opacity-0 animate-[done-row_400ms_ease-out_forwards]"
                style={{ animationDelay: `${200 + i * 160}ms` }}
              >
                <span className="text-sm text-ink-soft">{row.label}</span>
                <span
                  className={`shrink-0 text-sm font-semibold ${
                    row.points > 0
                      ? 'text-accent'
                      : row.points < 0
                        ? 'text-ink-muted'
                        : 'text-ink-muted'
                  }`}
                >
                  {row.points > 0 ? `+${row.points}` : row.points}
                </span>
              </li>
            ))}
            {reviewPoints > 0 && (
              <li
                className="done-anim flex items-center justify-between gap-3 opacity-0 animate-[done-row_400ms_ease-out_forwards]"
                style={{ animationDelay: `${200 + rows.length * 160}ms` }}
              >
                <span className="text-sm text-ink-soft">Review bonus</span>
                <span className="shrink-0 text-sm font-semibold text-accent">
                  +{reviewPoints}
                </span>
              </li>
            )}
          </ul>
          <hr className="my-4 border-slate-100" />
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-ink">Total this session</span>
            <span
              className={`text-2xl font-bold ${
                g.total_earned + reviewPoints >= 0 ? 'text-gold' : 'text-ink-soft'
              }`}
            >
              <CountUp
                to={g.total_earned + reviewPoints}
                delay={totalDelay}
                signed
              />{' '}
              XP
            </span>
          </div>
          {g.total_earned < 0 && (
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              A tough session — it happens. Your overall XP never drops below
              zero, and tomorrow is a fresh start.
            </p>
          )}
        </Card>
      )}

      {/* Level-up moment */}
      {leveledUp && (
        <Card
          className="done-anim border border-gold/30 bg-gold-tint opacity-0 animate-[done-row_500ms_ease-out_forwards]"
          style={{ animationDelay: `${totalDelay + 400}ms` }}
        >
          <p className="text-xs font-medium tracking-wide text-amber-700 uppercase">
            Level up!
          </p>
          <p className="mt-1 text-xl font-bold text-ink">
            You're now {g.level_name}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            New characters may be waiting for you.
          </p>
        </Card>
      )}

      {/* Streak + totals strip */}
      <div className="flex items-center justify-center gap-3">
        {g.current_streak > 0 && (
          <Badge tone="accent" className="px-3 py-1.5 text-sm">
            <Icon name="flame" className="h-4 w-4" />
            {g.current_streak}-day streak
          </Badge>
        )}
        <Badge tone="primary" className="px-3 py-1.5 text-sm">
          {g.total_points.toLocaleString()} XP total
        </Badge>
      </div>

      <div className="space-y-3 pt-2">
        {tracked.testId && (
          <Link to={`/student/tests/${tracked.testId}/results`} className="block">
            <Button full variant="secondary">
              Review my answers
            </Button>
          </Link>
        )}
        <Link to="/student" className="block">
          <Button full>Back to home</Button>
        </Link>
      </div>
    </div>
  )
}
