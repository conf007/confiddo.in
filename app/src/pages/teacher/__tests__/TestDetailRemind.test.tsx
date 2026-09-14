import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as teacherApi from '../../../lib/api/teacher'
import { TestDetailPage } from '../TestDetailPage'
import { renderRoutes } from './helpers'

vi.mock('../../../lib/api/teacher', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/api/teacher')>()
  return {
    ...actual,
    getTestAsPaper: vi.fn(),
    getTestAttemptStatus: vi.fn(),
    remindStudents: vi.fn(),
    remindOneStudent: vi.fn(),
  }
})

function renderPage() {
  return renderRoutes([{ path: '/teacher/tests/:testId', element: <TestDetailPage /> }], '/teacher/tests/t1')
}

describe('TestDetailPage reminders', () => {
  beforeEach(() => {
    vi.mocked(teacherApi.getTestAsPaper).mockResolvedValue({
      test_id: 't1', title: 'Fractions', instructions: '', duration_minutes: 20, total_marks: 10,
      sections: [], status: 'live', class_id: 'c1', subject: 'Mathematics', class_name: 'Class 8A', grade: '8',
    })
    vi.mocked(teacherApi.getTestAttemptStatus).mockResolvedValue({
      test_id: 't1', test_title: 'Fractions', class_id: 'c1', class_name: 'Class 8A', deadline: null, total_students: 2,
      not_started: [
        { id: 's1', full_name: 'Ravi Kumar', roll_number: null },
        { id: 's2', full_name: 'Asha Rao', roll_number: null },
      ],
      in_progress: [], completed: [],
    })
    vi.mocked(teacherApi.remindStudents).mockReset()
    vi.mocked(teacherApi.remindOneStudent).mockReset()
  })

  it('reminds only the selected students', async () => {
    vi.mocked(teacherApi.remindStudents).mockResolvedValue({ test_id: 't1', sent: 1, skipped: 0, total_targets: 1 })
    renderPage()
    expect(await screen.findByRole('button', { name: 'Remind all' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Ravi Kumar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remind selected (1)' }))
    await waitFor(() => expect(teacherApi.remindStudents).toHaveBeenCalledWith('t1', ['s1']))
    expect(await screen.findByRole('status')).toHaveTextContent('Reminder sent to 1 student.')
    expect(screen.getByRole('button', { name: 'Remind all' })).toBeInTheDocument()
  })

  it('reminds one student from the row and reports already-reminded-today', async () => {
    vi.mocked(teacherApi.remindOneStudent).mockResolvedValue({ test_id: 't1', sent: 0, skipped: 1, total_targets: 1 })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Remind Asha Rao' }))
    await waitFor(() => expect(teacherApi.remindOneStudent).toHaveBeenCalledWith('t1', 's2'))
    expect(await screen.findByRole('status')).toHaveTextContent('Already reminded Asha today.')
    expect(teacherApi.remindStudents).not.toHaveBeenCalled()
  })
})
