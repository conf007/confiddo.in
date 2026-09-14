export interface LevelStep {
  name: string
  xp: number
  emoji: string
  weeks: string
}

export const LEVEL_JOURNEY: readonly LevelStep[] = [
  { name: 'Explorer', xp: 0, emoji: '🚀', weeks: '0' },
  { name: 'Rising Star', xp: 50, emoji: '⚡', weeks: '~1' },
  { name: 'Super Nova', xp: 200, emoji: '💫', weeks: '~4' },
  { name: 'Blazing Pro', xp: 500, emoji: '🔥', weeks: '~8' },
  { name: 'Galaxy Master', xp: 1000, emoji: '🌌', weeks: '~16' },
]

export function levelEmoji(level: number): string {
  return LEVEL_JOURNEY[Math.min(Math.max(level, 0), LEVEL_JOURNEY.length - 1)].emoji
}

export function nextLevelStep(level: number): LevelStep | null {
  return LEVEL_JOURNEY[level + 1] ?? null
}
