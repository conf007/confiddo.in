import { Link } from 'react-router-dom'
import { Card } from '../ui/Card'
import { Icon } from '../icons'
import { ProgressBar } from './ProgressBar'
import { levelProgressFrom } from './gamification'
import { levelEmoji, nextLevelStep } from './levels'
import type { GamificationData } from '../../lib/api/student'

export function LevelCard({ g }: { g: GamificationData }) {
  const { progress, toNext } = levelProgressFrom(g)
  const next = nextLevelStep(g.level)
  const max = toNext === null
  return (
    <Link to="/student/xp-rules" className="block" data-testid="level-card">
      <Card className={max ? 'bg-navy text-white' : ''}>
        <div className="flex items-center gap-3.5">
          <span
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl ${max ? 'bg-white/10' : 'bg-primary-tint'}`}
            aria-hidden="true"
          >
            {levelEmoji(g.level)}
          </span>
          <div className="min-w-0 flex-1">
            <p className={`text-xl font-extrabold ${max ? 'text-white' : 'text-ink'}`}>{g.level_name}</p>
            <p className={`text-sm ${max ? 'text-white/70' : 'text-ink-muted'}`}>
              {g.total_points.toLocaleString()} XP
              {max ? " · You're legendary!" : g.total_points === 0 ? ' · Just getting started' : ' · Keep going!'}
            </p>
          </div>
          <Icon name="chevron-down" className={`h-4 w-4 -rotate-90 ${max ? 'text-white/60' : 'text-ink-muted'}`} />
        </div>
        <div className={`mt-4 flex justify-between text-xs ${max ? 'text-white/70' : 'text-ink-muted'}`}>
          <span>{max ? 'Max Level' : `Level ${g.level + 1}`}</span>
          <span>{max ? '∞' : `${(g.next_level_points ?? 0).toLocaleString()} XP`}</span>
        </div>
        <div className="mt-1.5">
          <ProgressBar value={progress} tone={max ? 'primary' : 'accent'} label="Level progress" />
        </div>
        <p className={`mt-2 text-xs ${max ? 'text-white/80' : 'text-ink-soft'}`}>
          {max || !next ? "You've reached the top! Keep shining ✨" : `${toNext.toLocaleString()} XP to ${next.name} ${next.emoji}`}
        </p>
      </Card>
    </Link>
  )
}
