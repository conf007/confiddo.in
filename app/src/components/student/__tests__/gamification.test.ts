import { describe, expect, it } from 'vitest'
import { levelProgressFrom, streakTodayStatus } from '../gamification'

describe('levelProgressFrom', () => {
  it('uses the server thresholds, not the client table', () => {
    expect(levelProgressFrom({ total_points: 300, next_level_points: 600, current_level_points: 200 })).toEqual({
      progress: 0.25,
      toNext: 300,
    })
  })

  it('is complete at the top level', () => {
    expect(levelProgressFrom({ total_points: 5000, next_level_points: null, current_level_points: 1000 })).toEqual({
      progress: 1,
      toNext: null,
    })
  })

  it('clamps to [0, 1]', () => {
    expect(levelProgressFrom({ total_points: 999, next_level_points: 500, current_level_points: 200 }).progress).toBe(1)
    expect(levelProgressFrom({ total_points: 0, next_level_points: 500, current_level_points: 200 }).progress).toBe(0)
  })
})

describe('streakTodayStatus', () => {
  const today = new Date(2026, 8, 13, 15, 0, 0)

  it('knows when today is already done', () => {
    expect(streakTodayStatus({ last_active_date: '2026-09-13', current_streak: 4 }, today)).toEqual({
      practicedToday: true,
      label: 'Practised today',
    })
  })

  it('nudges to keep a live streak', () => {
    expect(streakTodayStatus({ last_active_date: '2026-09-12', current_streak: 4 }, today).label).toBe(
      'Practise today to keep your streak',
    )
  })

  it('nudges to start one', () => {
    expect(streakTodayStatus({ last_active_date: null, current_streak: 0 }, today).label).toBe(
      'Practise today to start a streak',
    )
  })
})
