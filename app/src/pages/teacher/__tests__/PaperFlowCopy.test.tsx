import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as teacherApi from '../../../lib/api/teacher'
import { PaperFlowPage } from '../PaperFlowPage'
import { renderRoutes } from './helpers'

vi.mock('../../../lib/api/teacher', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/api/teacher')>()
  return { ...actual, getTeacherClasses: vi.fn(), getDraftReview: vi.fn() }
})

describe('PaperFlowPage copy as text', () => {
  const writeText = vi.fn()
  beforeEach(() => {
    vi.mocked(teacherApi.getTeacherClasses).mockResolvedValue({ classes: [] })
    vi.mocked(teacherApi.getDraftReview).mockResolvedValue({
      test_id: 'd1',
      title: 'Mathematics Quiz - 14/09, 1:00 PM',
      review_state: { slot_question_ids: ['q1', 'q2'], current_index: 2, review_phase: 'final_draft' },
      questions: [
        { id: 'q1', number: 1, type: 'mcq', marks: 1, text: 'What is 2 + 2?', options: ['3', '4'], expected_answer: 'B. 4' },
        { id: 'q2', number: 2, type: 'mcq', marks: 2, text: 'What is 3 × 3?', options: ['9', '6'], expected_answer: 'A. 9' },
      ],
      config: { subject_name: 'Mathematics', class_id: 'c1', class_name: 'Class 8A', grade: '8' },
    })
    writeText.mockReset()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  })
  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
  })

  it('copies the draft as plain text from step 3', async () => {
    writeText.mockResolvedValue(undefined)
    renderRoutes([{ path: '/teacher/paper/new', element: <PaperFlowPage /> }], '/teacher/paper/new?testId=d1')
    fireEvent.click(await screen.findByRole('button', { name: 'Copy as text' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    expect(writeText.mock.calls[0][0]).toBe(
      [
        'Mathematics Quiz - 14/09, 1:00 PM',
        'Mathematics • Class 8A • 2 questions',
        '',
        'Q1. [1 mark] What is 2 + 2?',
        '  a) 3',
        '  b) 4',
        '',
        'Q2. [2 marks] What is 3 × 3?',
        '  a) 9',
        '  b) 6',
        '',
      ].join('\n'),
    )
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('reports when the clipboard is unavailable', async () => {
    writeText.mockRejectedValue(new Error('denied'))
    renderRoutes([{ path: '/teacher/paper/new', element: <PaperFlowPage /> }], '/teacher/paper/new?testId=d1')
    fireEvent.click(await screen.findByRole('button', { name: 'Copy as text' }))
    expect(await screen.findByRole('button', { name: 'Couldn’t copy' })).toBeInTheDocument()
  })
})
