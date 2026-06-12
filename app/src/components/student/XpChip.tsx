/**
 * Header chip: level name + XP, plus streak flame when a streak is alive.
 * Shares the gamification query cache with Progress/Badges/Characters pages.
 */
import { Link } from 'react-router-dom'
import { Icon } from '../icons'
import { useGamificationQuery } from './hooks'

export function XpChip() {
  const { data: g } = useGamificationQuery()

  // Quietly render nothing until data arrives — the header stays calm.
  if (!g) return null

  return (
    <Link
      to="/student/progress"
      className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-full bg-accent-tint px-3 text-xs font-semibold text-accent transition-colors hover:bg-accent/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      title={`${g.level_name} — ${g.total_points} XP`}
    >
      {g.current_streak > 0 && (
        <span className="inline-flex items-center gap-0.5" aria-label={`${g.current_streak} day streak`}>
          <Icon name="flame" className="h-3.5 w-3.5" />
          {g.current_streak}
        </span>
      )}
      <span>
        {g.level_name} · {g.total_points.toLocaleString()} XP
      </span>
    </Link>
  )
}
