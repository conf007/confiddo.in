import type { GamificationData } from '../../lib/api/student'

export interface LevelProgress {
  progress: number
  toNext: number | null
}

export function levelProgressFrom(
  g: Pick<GamificationData, 'total_points' | 'next_level_points' | 'current_level_points'>,
): LevelProgress {
  const next = g.next_level_points
  if (next === null || next === undefined) return { progress: 1, toNext: null }
  const floor = g.current_level_points ?? 0
  const span = next - floor
  const progress = span > 0 ? Math.min(1, Math.max(0, (g.total_points - floor) / span)) : 1
  return { progress, toNext: Math.max(0, next - g.total_points) }
}

export function localDateString(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export interface StreakTodayStatus {
  practicedToday: boolean
  label: string
}

export function streakTodayStatus(
  g: Pick<GamificationData, 'last_active_date' | 'current_streak'>,
  now = new Date(),
): StreakTodayStatus {
  const practicedToday =
    !!g.last_active_date && g.last_active_date.slice(0, 10) === localDateString(now)
  if (practicedToday) return { practicedToday, label: 'Practised today' }
  if (g.current_streak > 0) return { practicedToday, label: 'Practise today to keep your streak' }
  return { practicedToday, label: 'Practise today to start a streak' }
}
