import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as teacherApi from '../../../lib/api/teacher'
import { StudentDetailPage } from '../StudentDetailPage'
import { renderRoutes } from './helpers'

vi.mock('../../../lib/api/teacher', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/api/teacher')>()
  return {
    ...actual,
    getStudentTrend: vi.fn(),
    getMultiSubjectView: vi.fn(),
    getTeacherNotes: vi.fn(),
    getStudentFlags: vi.fn(),
    getInterventions: vi.fn(),
    getStudentJourney: vi.fn(),
  }
})

const journey: teacherApi.StudentJourney = {
  student: { id: 's1', full_name: 'Asha Rao', class_grade: '8', section: 'A' },
  class_name: 'Class 8A',
  subject: 'Mathematics',
  journey: {
    child_first_name: 'Asha',
    total_weeks: 2,
    week_labels: ['W1', 'W2'],
    subject: {
      name: 'Mathematics',
      weeks: [
        { week_index: 0, week_start: '2026-08-31', child_level: 'attempting', class_avg_level: 'practicing' },
        { week_index: 1, week_start: '2026-09-07', child_level: 'practicing', class_avg_level: 'practicing' },
      ],
      levels_gained: 1,
      current_level: 'practicing',
      current_display: 'Practicing',
    },
    summary_stats: { weeks_tracked: 2, levels_gained: 1, current_avg_level: 'practicing', current_avg_display: 'Practicing' },
    insights: [{ type: 'positive', subject: 'Mathematics', message: 'Asha moved up a level in Mathematics.' }],
  },
  subject_summary: null,
}

function renderAt(path: string) {
  return renderRoutes([{ path: '/teacher/students/:studentId', element: <StudentDetailPage /> }], path)
}

describe('StudentDetailPage journey', () => {
  beforeEach(() => {
    vi.mocked(teacherApi.getStudentTrend).mockResolvedValue({
      student_id: 's1', student_first_name: 'Asha', current_level: 'practicing', current_level_display: 'Practicing', weeks: [],
    })
    vi.mocked(teacherApi.getMultiSubjectView).mockResolvedValue({ student_id: 's1', student_first_name: 'Asha', subjects: [], insights: [] })
    vi.mocked(teacherApi.getTeacherNotes).mockResolvedValue({ student_id: 's1', student_first_name: 'Asha', notes: [] })
    vi.mocked(teacherApi.getStudentFlags).mockResolvedValue({ flags: [] })
    vi.mocked(teacherApi.getInterventions).mockResolvedValue({
      student_first_name: 'Asha', current_level: 'practicing', current_level_display: 'Practicing', strategies: [], general_tips: [],
    })
    vi.mocked(teacherApi.getStudentJourney).mockReset()
    vi.mocked(teacherApi.getStudentJourney).mockResolvedValue(journey)
  })

  it('renders the per-subject journey when opened from a class', async () => {
    renderAt('/teacher/students/s1?classId=c1')
    const card = await screen.findByTestId('student-journey')
    expect(card).toHaveTextContent('Journey in Mathematics')
    expect(card).toHaveTextContent('Weeks tracked2')
    expect(card).toHaveTextContent('+1')
    expect(card).toHaveTextContent('Attempting')
    expect(card).toHaveTextContent('Asha moved up a level in Mathematics.')
    expect(screen.getByRole('heading', { name: 'Asha Rao' })).toBeInTheDocument()
    expect(screen.getByText(/Class 8 • Section A • Class 8A/)).toBeInTheDocument()
    expect(teacherApi.getStudentJourney).toHaveBeenCalledWith('s1', 'c1')
    expect(card).not.toHaveTextContent(/\d+\s?%/)
  })

  it('does not request the journey without a class context', async () => {
    renderAt('/teacher/students/s1')
    await screen.findByRole('heading', { name: 'Asha' })
    await waitFor(() => expect(screen.queryByTestId('student-journey')).not.toBeInTheDocument())
    expect(teacherApi.getStudentJourney).not.toHaveBeenCalled()
  })
})
