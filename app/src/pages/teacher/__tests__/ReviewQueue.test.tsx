import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as teacherApi from '../../../lib/api/teacher'
import { ReviewQueuePage } from '../ReviewQueuePage'
import { renderRoutes } from './helpers'

vi.mock('../../../lib/api/teacher', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/api/teacher')>()
  return {
    ...actual,
    startReviewSession: vi.fn(),
    getClassSuggestions: vi.fn(),
    validateSuggestion: vi.fn(),
    bulkValidateSuggestions: vi.fn(),
    getBulkValidationOverview: vi.fn(),
    completeReviewSession: vi.fn(),
  }
})

const suggestion = (id: string, name: string, validated: boolean, hasChange: boolean): teacherApi.StudentSuggestion => ({
  suggestion_id: id, student_id: `st-${id}`, student_first_name: name,
  current_level: 'practicing', current_level_display: 'Practicing',
  suggested_level: hasChange ? 'confident' : 'practicing', suggested_level_display: hasChange ? 'Confident' : 'Practicing',
  has_change: hasChange, observed_patterns: [], validation_status: validated ? 'validated' : 'pending',
  test_id: 't1', test_title: 'Fractions', previous_level: null, previous_level_display: null,
  worksheet_count: 1, readiness_score: null,
  ...(validated ? { validation_action: 'agree' as const, final_level: 'confident', final_level_display: 'Confident' } : {}),
})

function renderPage() {
  return renderRoutes(
    [{ path: '/teacher/classes/:classId/review', element: <ReviewQueuePage /> }],
    '/teacher/classes/c1/review?test=t1',
  )
}

describe('ReviewQueuePage', () => {
  beforeEach(() => {
    vi.mocked(teacherApi.startReviewSession).mockResolvedValue({
      session_id: 'rs1', class_id: 'c1', test_id: 't1', week_start_date: '2026-09-07', status: 'in_progress',
      total_students: 2, students_reviewed: 1, started_at: null,
    })
    vi.mocked(teacherApi.getClassSuggestions).mockResolvedValue({
      week_start_date: '2026-09-07', class_id: 'c1', test_id: 't1', test_title: 'Fractions',
      suggestions: [suggestion('sg1', 'Asha', true, true), suggestion('sg2', 'Ravi', false, false)],
    })
    vi.mocked(teacherApi.validateSuggestion).mockReset()
    vi.mocked(teacherApi.validateSuggestion).mockResolvedValue({
      validation_id: 'v', action: 'agree', final_level: 'confident', final_level_display: 'Confident', validated_at: 'now',
    })
    vi.mocked(teacherApi.bulkValidateSuggestions).mockReset()
    vi.mocked(teacherApi.bulkValidateSuggestions).mockResolvedValue({ validated_count: 1 })
    vi.mocked(teacherApi.getBulkValidationOverview).mockResolvedValue({
      class_id: 'c1', class_name: 'Class 8A', total: 2, no_change_count: 1, changed_count: 1,
      no_change_suggestions: [{
        suggestion_id: 'sg2', student_first_name: 'Ravi', current_level: 'practicing', current_level_display: 'Practicing',
        suggested_level: 'practicing', suggested_level_display: 'Practicing', has_change: false,
      }],
      changed_suggestions: [{
        suggestion_id: 'sg1', student_first_name: 'Asha', current_level: 'practicing', current_level_display: 'Practicing',
        suggested_level: 'confident', suggested_level_display: 'Confident', has_change: true,
      }],
    })
  })

  it('undoes a validated decision locally so it can be redone', async () => {
    renderPage()
    expect(await screen.findByText('1')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Agree' })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getAllByRole('button', { name: 'Agree' })).toHaveLength(2)
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Agree' })[0])
    await waitFor(() =>
      expect(teacherApi.validateSuggestion).toHaveBeenCalledWith('sg1', 'agree', undefined, expect.anything()),
    )
    expect(await screen.findByRole('button', { name: 'Undo' })).toBeInTheDocument()
  })

  it('shows the bulk overview before agreeing with everyone', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Agree with all remaining (1)' }))
    const overview = await screen.findByTestId('bulk-overview')
    await waitFor(() => expect(overview).toHaveTextContent('1 suggestion keep the current level; 0 propose a change.'))
    expect(overview).toHaveTextContent('Ravi · Practicing')
    expect(overview).not.toHaveTextContent('Asha')
    expect(teacherApi.bulkValidateSuggestions).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Agree with 1 unchanged' }))
    await waitFor(() => expect(teacherApi.bulkValidateSuggestions).toHaveBeenCalledWith('c1', ['sg2'], 'agree'))
    await waitFor(() => expect(screen.queryByTestId('bulk-overview')).not.toBeInTheDocument())
  })
})
