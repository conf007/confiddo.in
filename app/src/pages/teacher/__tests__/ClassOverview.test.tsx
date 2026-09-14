import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api/client'
import * as teacherApi from '../../../lib/api/teacher'
import { ClassOverviewPage } from '../ClassOverviewPage'
import { renderRoutes } from './helpers'

vi.mock('../../../lib/api/teacher', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/api/teacher')>()
  return {
    ...actual,
    getClassOverview: vi.fn(),
    getClassStudentGroups: vi.fn(),
    getClassTests: vi.fn(),
    modifyStudentLevel: vi.fn(),
  }
})

const locked = () =>
  new ApiError(403, 'A newer review has been completed. Modifications are locked.', 'MODIFICATION_LOCKED')

function renderPage() {
  return renderRoutes([{ path: '/teacher/classes/:classId', element: <ClassOverviewPage /> }], '/teacher/classes/c1')
}

describe('ClassOverviewPage', () => {
  beforeEach(() => {
    vi.mocked(teacherApi.getClassOverview).mockResolvedValue({
      class_info: {
        id: 'c1', name: 'Class 8A', grade: '8', subject: 'Mathematics', student_count: 1,
        has_pending_review: false, last_reviewed_at: null,
      },
      tests: [],
      weekly_summary: { week_start_date: '2026-09-07', status: 'no_tests', tests_reviewed: 0, tests_total: 0 },
    })
    vi.mocked(teacherApi.getClassStudentGroups).mockResolvedValue({
      week_label: 'This Week', class_name: 'Class 8A', subject: 'Mathematics', total_students: 1, can_modify: true,
      groups: [{
        level: 'practicing', level_display: 'Practicing',
        students: [{ id: 's1', full_name: 'Asha Rao', level: 'practicing', level_display: 'Practicing' }],
      }],
    })
    vi.mocked(teacherApi.getClassTests).mockResolvedValue({
      class_id: 'c1',
      tests: [{
        id: 't1', title: 'Fractions quiz', subject: 'Mathematics', total_questions: 1, difficulty: null,
        created_by_name: 'Meera Iyer',
        questions: [{
          id: 'q1', text: 'What is 1/2 + 1/4?', topic: 'Fractions',
          options: [{ id: 'o1', text: '3/4', is_correct: true }, { id: 'o2', text: '2/6', is_correct: false }],
        }],
      }],
    })
    vi.mocked(teacherApi.modifyStudentLevel).mockReset()
  })

  it('lists the class tests with their content', async () => {
    renderPage()
    expect(await screen.findByText('Fractions quiz')).toBeInTheDocument()
    expect(screen.getByText(/by Meera Iyer/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Questions' }))
    expect(screen.getByText(/What is 1\/2 \+ 1\/4\?/)).toBeInTheDocument()
    expect(teacherApi.getClassTests).toHaveBeenCalledWith('c1')
  })

  it('surfaces MODIFICATION_LOCKED when a level change is refused, then saves once allowed', async () => {
    vi.mocked(teacherApi.modifyStudentLevel).mockRejectedValueOnce(locked()).mockResolvedValue({
      student_id: 's1', new_level: 'confident', new_level_display: 'Confident', validation_id: 'v1', modified_at: 'now',
    })
    renderPage()
    expect(await screen.findByText('Levels editable')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: /Change level/ })[0])
    expect(screen.getByTestId('level-change')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: /^L4/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save level' }))
    expect(await screen.findByText('A newer review is complete — earlier levels are locked.')).toBeInTheDocument()
    expect(teacherApi.modifyStudentLevel).toHaveBeenCalledWith('c1', 's1', 'confident')
    fireEvent.click(screen.getByRole('button', { name: 'Save level' }))
    await waitFor(() => expect(screen.queryByTestId('level-change')).not.toBeInTheDocument())
    expect(teacherApi.modifyStudentLevel).toHaveBeenCalledTimes(2)
  })

  it('hides level editing when the backend says it cannot be modified', async () => {
    vi.mocked(teacherApi.getClassStudentGroups).mockResolvedValue({
      week_label: 'AI Estimated', class_name: 'Class 8A', subject: 'Mathematics', total_students: 1, can_modify: false,
      groups: [{
        level: 'practicing', level_display: 'Practicing',
        students: [{ id: 's1', full_name: 'Asha Rao', level: 'practicing', level_display: 'Practicing' }],
      }],
    })
    renderPage()
    expect(await screen.findByText('AI Estimated')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Change level/ })).not.toBeInTheDocument()
  })
})
