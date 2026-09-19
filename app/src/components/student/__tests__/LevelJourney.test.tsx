import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { GamificationData } from '../../../lib/api/student'
import { LevelCard } from '../LevelCard'
import { LevelJourney } from '../LevelJourney'
import { WeeklyGoals } from '../WeeklyGoals'

const g = (over: Partial<GamificationData> = {}): GamificationData => ({
  total_points: 320, current_streak: 2, longest_streak: 5, level: 2, level_name: 'Super Nova',
  next_level_points: 500, current_level_points: 200, last_active_date: null,
  total_tests_completed: 4, total_practice_days: 6, weeks_with_activity: 2, perfect_test_count: 0,
  ...over,
})

describe('LevelJourney', () => {
  it('marks completed, current and locked levels from the server level', () => {
    render(<LevelJourney g={g()} />)
    expect(screen.getByTestId('journey-0')).toHaveAttribute('data-state', 'completed')
    expect(screen.getByTestId('journey-1')).toHaveAttribute('data-state', 'completed')
    expect(screen.getByTestId('journey-2')).toHaveAttribute('data-state', 'current')
    expect(screen.getByTestId('journey-3')).toHaveAttribute('data-state', 'locked')
    expect(screen.getByText('← YOU')).toBeInTheDocument()
    expect(screen.getByText('320 / 500 XP')).toBeInTheDocument()
    expect(screen.getByText('Galaxy Master')).toBeInTheDocument()
  })
})

describe('LevelCard', () => {
  it('shows the level, XP to the next level and its emoji', () => {
    render(<MemoryRouter><LevelCard g={g()} /></MemoryRouter>)
    expect(screen.getByText('Super Nova')).toBeInTheDocument()
    expect(screen.getByText('180 XP to Blazing Pro 🔥')).toBeInTheDocument()
    expect(screen.getByText('Level 3')).toBeInTheDocument()
  })

  it('celebrates the top level', () => {
    render(<MemoryRouter><LevelCard g={g({ level: 4, level_name: 'Galaxy Master', total_points: 1200, next_level_points: null, current_level_points: 1000 })} /></MemoryRouter>)
    expect(screen.getByText('Max Level')).toBeInTheDocument()
    expect(screen.getByText("You've reached the top! Keep shining ✨")).toBeInTheDocument()
  })
})

describe('WeeklyGoals', () => {
  it('flips the streak goal once the streak is three days', () => {
    const { rerender } = render(<WeeklyGoals g={{ current_streak: 1 }} />)
    expect(screen.getByText('Build 3-day streak')).toBeInTheDocument()
    rerender(<WeeklyGoals g={{ current_streak: 3 }} />)
    expect(screen.getByText('Keep streak going!')).toBeInTheDocument()
    expect(screen.getByText('Active!')).toBeInTheDocument()
  })
})
