import { Card } from '../ui/Card'
import { Icon } from '../icons'
import { LEVEL_JOURNEY } from './levels'
import type { GamificationData } from '../../lib/api/student'

export function LevelJourney({ g }: { g: Pick<GamificationData, 'level' | 'total_points' | 'next_level_points'> }) {
  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink">
        <span aria-hidden="true">🗺️</span>
        Level Journey
      </h2>
      <ol>
        {LEVEL_JOURNEY.map((step, i) => {
          const isCurrent = i === g.level
          const isCompleted = g.total_points >= step.xp
          const isLast = i === LEVEL_JOURNEY.length - 1
          const target = g.next_level_points ?? step.xp
          return (
            <li key={step.name} className="flex gap-4" data-testid={`journey-${i}`} data-state={isCurrent ? 'current' : isCompleted ? 'completed' : 'locked'}>
              <div className="flex flex-col items-center">
                <span
                  className={[
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl',
                    isCurrent ? 'bg-primary' : isCompleted ? 'bg-success' : 'bg-slate-100 grayscale opacity-60',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  {step.emoji}
                </span>
                {!isLast && (
                  <span className={`my-1 w-0.5 flex-1 rounded-full ${isCompleted ? 'bg-success' : 'bg-slate-100'}`} />
                )}
              </div>
              <div className={isLast ? 'pt-1' : 'pt-1 pb-6'}>
                <p className="flex items-center gap-2 text-base font-semibold">
                  <span className={isCurrent ? 'text-primary' : isCompleted ? 'text-ink' : 'text-ink-muted'}>{step.name}</span>
                  {isCurrent && (
                    <span className="rounded-lg bg-primary-tint px-2 py-0.5 text-[10px] font-bold text-primary">← YOU</span>
                  )}
                  {isCompleted && !isCurrent && <Icon name="check" className="h-4 w-4 text-success" />}
                </p>
                <p className={`text-sm ${isCurrent ? 'font-semibold text-primary' : 'text-ink-muted'}`}>
                  {isCurrent ? `${g.total_points.toLocaleString()} / ${target.toLocaleString()} XP` : `${step.xp.toLocaleString()} XP`}
                  {!isCompleted && !isCurrent && <span className="ml-2 text-xs text-ink-muted">• {step.weeks} weeks</span>}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
