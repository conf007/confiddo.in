import { Card } from '../ui/Card'
import type { GamificationData } from '../../lib/api/student'

export function WeeklyGoals({ g }: { g: Pick<GamificationData, 'current_streak'> }) {
  const streakOn = g.current_streak >= 3
  const goals = [
    { emoji: '🎯', title: 'Complete a test', reward: '+35 XP', done: false },
    { emoji: '🔥', title: streakOn ? 'Keep streak going!' : 'Build 3-day streak', reward: streakOn ? 'Active!' : '+15 XP', done: streakOn },
    { emoji: '📚', title: 'Practice 5 days', reward: 'Badge unlock', done: false },
  ]
  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-tint" aria-hidden="true">✨</span>
        This Week's Goals
      </h2>
      <ul className="space-y-2">
        {goals.map((goal) => (
          <li key={goal.title} className="flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">{goal.emoji}</span>
            <span className={`flex-1 text-sm ${goal.done ? 'text-ink-muted line-through' : 'text-ink'}`}>{goal.title}</span>
            <span className={`rounded-lg px-3 py-1 text-xs font-semibold ${goal.done ? 'bg-success-tint text-success' : 'bg-primary-tint text-primary'}`}>
              {goal.reward}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
