import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ClassRankingEntry } from '../../../lib/api/student'
import { GalaxyMap } from '../GalaxyMap'
import { galaxyMaxXp, xpToNextRank } from '../galaxy'

const entry = (rank: number, total_points: number, is_current_user = false): ClassRankingEntry => ({
  student_id: `s${rank}`, name: `Student ${rank}`, character: 'ace', total_points, current_streak: 0, level: 0, is_current_user, rank,
})
const classmates = [entry(1, 320), entry(2, 210), entry(3, 150, true), entry(4, 40), entry(5, 0)]

describe('galaxy maths', () => {
  it('scales the map to the top student, never below 180 XP', () => {
    expect(galaxyMaxXp(classmates)).toBe(320)
    expect(galaxyMaxXp([entry(1, 20)])).toBe(180)
  })

  it('tells the student how much XP moves them up one rank', () => {
    expect(xpToNextRank(classmates)).toBe(61)
    expect(xpToNextRank([entry(1, 50, true), entry(2, 10)])).toBe(0)
  })
})

describe('GalaxyMap', () => {
  it('draws the sun, rank 1 with a crown, the student as a star and the rest as dots', () => {
    render(<GalaxyMap entries={classmates} />)
    expect(screen.getByTestId('galaxy-map')).toBeInTheDocument()
    expect(screen.getByText('🎯')).toBeInTheDocument()
    expect(screen.getByTestId('galaxy-crown')).toHaveTextContent('👑')
    expect(screen.getByTestId('galaxy-you')).toHaveTextContent('⭐You')
    expect(screen.getAllByTestId('galaxy-mate')).toHaveLength(3)
    for (const zone of ['Inner', 'Mid', 'Rising']) expect(screen.getByText(zone)).toBeInTheDocument()
  })
})
