import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as teacherApi from '../../../lib/api/teacher'
import { AllHistoryPage, ClassHistoryPage } from '../HistoryPages'
import { renderRoutes } from './helpers'

vi.mock('../../../lib/api/teacher', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/api/teacher')>()
  return { ...actual, getClassReviewHistory: vi.fn(), getAllClassesHistory: vi.fn() }
})

const review = (id: string, title: string, extra: Partial<teacherApi.HistoricalReview> = {}): teacherApi.HistoricalReview => ({
  session_id: id, test_id: `t-${id}`, test_title: title, week_start_date: '2026-09-07', status: 'completed',
  total_students: 2, students_reviewed: 2, total_time_ms: 90000, total_time_display: '1m 30s',
  moved_up: 1, moved_down: 0, stayed: 1,
  decisions: [
    { student_first_name: 'Asha', current_level: 'practicing', suggested_level: 'confident', action: 'agree', final_level: 'confident' },
    { student_first_name: 'Ravi', current_level: 'practicing', suggested_level: 'practicing', action: 'same', final_level: 'practicing' },
  ],
  ...extra,
})

describe('ClassHistoryPage', () => {
  beforeEach(() => {
    vi.mocked(teacherApi.getClassReviewHistory).mockResolvedValue({
      class_id: 'c1', class_name: 'Class 8A', reviews: [review('r1', 'Fractions')],
    })
  })

  it('lists past reviews and expands the decisions grouped by final level', async () => {
    renderRoutes([{ path: '/teacher/classes/:classId/history', element: <ClassHistoryPage /> }], '/teacher/classes/c1/history')
    expect(await screen.findByRole('heading', { name: 'Past reviews' })).toBeInTheDocument()
    const card = screen.getByTestId('review-card')
    expect(card).toHaveTextContent('Fractions')
    expect(card).toHaveTextContent('1m 30s')
    expect(screen.queryByText('Agreed')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Fractions/ }))
    expect(screen.getByText('Agreed')).toBeInTheDocument()
    expect(screen.getByText('Kept same')).toBeInTheDocument()
    expect(card).not.toHaveTextContent(/\d+\s?%/)
    expect(teacherApi.getClassReviewHistory).toHaveBeenCalledWith('c1')
  })
})

describe('AllHistoryPage', () => {
  beforeEach(() => {
    vi.mocked(teacherApi.getAllClassesHistory).mockResolvedValue({
      classes: [{ class_id: 'c1', class_name: 'Class 8A' }, { class_id: 'c2', class_name: 'Class 9B' }],
      reviews: [
        review('r1', 'Fractions', { class_id: 'c1', class_name: 'Class 8A' }),
        review('r2', 'Algebra', { class_id: 'c2', class_name: 'Class 9B' }),
      ],
      total_count: 2,
    })
  })

  it('filters the cross-class list by class chip', async () => {
    renderRoutes([{ path: '/teacher/history', element: <AllHistoryPage /> }], '/teacher/history')
    expect(await screen.findByText('2 past reviews across 2 classes')).toBeInTheDocument()
    expect(screen.getAllByTestId('review-card')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Class 9B (1)' }))
    expect(screen.getAllByTestId('review-card')).toHaveLength(1)
    expect(screen.getByTestId('review-card')).toHaveTextContent('Algebra')
    fireEvent.click(screen.getByRole('button', { name: 'All (2)' }))
    expect(screen.getAllByTestId('review-card')).toHaveLength(2)
  })
})
