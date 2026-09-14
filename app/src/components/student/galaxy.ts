import type { ClassRankingEntry } from '../../lib/api/student'

export function galaxyMaxXp(entries: ClassRankingEntry[]): number {
  return Math.max(180, ...entries.map((e) => e.total_points))
}

export function xpToNextRank(entries: ClassRankingEntry[]): number {
  const me = entries.find((e) => e.is_current_user)
  if (!me || me.rank === 1) return 0
  const others = entries.filter((e) => !e.is_current_user).sort((a, b) => b.total_points - a.total_points)
  const above = others[me.rank - 2]
  return above ? above.total_points - me.total_points + 1 : 10
}

export function seededRandom(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
