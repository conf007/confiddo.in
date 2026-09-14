import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as teacherApi from '../../../lib/api/teacher'
import { ExamPaperPage } from '../ExamPaperPage'
import { renderRoutes } from './helpers'

vi.mock('../../../lib/api/teacher', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/api/teacher')>()
  return {
    ...actual,
    getSyllabusBoards: vi.fn(),
    getSyllabusSubjects: vi.fn(),
    getSyllabusChapters: vi.fn(),
    getBlueprints: vi.fn(),
    getTeacherClasses: vi.fn(),
    generatePaperPrompt: vi.fn(),
    generatePaper: vi.fn(),
    savePaper: vi.fn(),
  }
})

const paper: teacherApi.ExamPaper = {
  title: 'Mathematics – Unit Test (Class 8)',
  subject: 'Mathematics',
  instructions: '1. All questions are compulsory.',
  duration_minutes: 90,
  total_marks: 15,
  sections: [
    {
      name: 'Section A – MCQ',
      questions: [
        { number: 1, type: 'mcq', marks: 1, text: 'Which is rational?', options: ['1/2', 'π', 'e', '√2'], expected_answer: 'A' },
      ],
    },
  ],
}

describe('ExamPaperPage', () => {
  beforeEach(() => {
    vi.mocked(teacherApi.getSyllabusBoards).mockResolvedValue({ boards: [{ id: 'b1', code: 'CBSE', name: 'CBSE' }] })
    vi.mocked(teacherApi.getSyllabusSubjects).mockResolvedValue({
      subjects: [{ id: 'sub1', board_id: 'b1', grade: 8, code: 'MATH', name: 'Mathematics', total_marks: 80, duration_minutes: 180 }],
    })
    vi.mocked(teacherApi.getSyllabusChapters).mockResolvedValue({
      chapters: [
        { id: 'ch1', subject_id: 'sub1', chapter_number: 1, name: 'Rational Numbers', unit_name: 'Algebra' },
        { id: 'ch2', subject_id: 'sub1', chapter_number: 2, name: 'Linear Equations', unit_name: 'Algebra' },
      ],
    })
    vi.mocked(teacherApi.getBlueprints).mockResolvedValue({
      blueprints: [{
        id: 'bp1', board_code: 'CBSE', paper_type: 'unit_test', label: 'Unit Test', total_marks: 20, duration_minutes: 90,
        default_question_mix: JSON.stringify([{ type: 'mcq', marks_each: 1, count: 5 }, { type: 'bogus', marks: 5, count: 2 }]),
        instructions: null,
      }],
    })
    vi.mocked(teacherApi.getTeacherClasses).mockResolvedValue({ classes: [] })
    vi.mocked(teacherApi.generatePaperPrompt).mockReset()
    vi.mocked(teacherApi.generatePaperPrompt).mockResolvedValue({ prompt_text: 'Generate a unit test question paper for:\nBoard: CBSE' })
    vi.mocked(teacherApi.generatePaper).mockReset()
    vi.mocked(teacherApi.generatePaper).mockResolvedValue(paper)
    vi.mocked(teacherApi.savePaper).mockReset()
    vi.mocked(teacherApi.savePaper).mockResolvedValue({
      test_id: 'new1', title: paper.title, total_questions: 1, is_active: true, message: 'ok',
    })
  })

  it('walks config → prompt → preview → save with the backend request shapes', async () => {
    renderRoutes([{ path: '/teacher/paper/exam', element: <ExamPaperPage /> }], '/teacher/paper/exam')
    const board = await screen.findByLabelText('Board')
    await waitFor(() => expect(board.querySelectorAll('option')).toHaveLength(2))
    fireEvent.change(board, { target: { value: 'b1' } })
    fireEvent.change(screen.getByLabelText('Grade'), { target: { value: '8' } })
    const subject = screen.getByLabelText('Subject')
    await waitFor(() => expect(subject.querySelectorAll('option')).toHaveLength(2))
    fireEvent.change(subject, { target: { value: 'sub1' } })
    fireEvent.click(await screen.findByLabelText('1. Rational Numbers'))
    expect(screen.getByText('1/2 selected')).toBeInTheDocument()
    await waitFor(() => expect(teacherApi.getBlueprints).toHaveBeenCalledWith('CBSE'))
    fireEvent.change(screen.getByLabelText('Paper type'), { target: { value: 'unit_test' } })
    expect(screen.getAllByTestId('mix-row')).toHaveLength(2)
    expect(screen.getByLabelText('Question type 2')).toHaveValue('short_answer')
    expect(screen.getByText('Total: 15 marks')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Generate prompt' }))
    await waitFor(() => expect(teacherApi.generatePaperPrompt).toHaveBeenCalledTimes(1))
    expect(teacherApi.generatePaperPrompt).toHaveBeenCalledWith({
      board_code: 'CBSE', grade: 8, subject_code: 'MATH', subject_name: 'Mathematics',
      chapter_names: ['Rational Numbers'], paper_type: 'unit_test', total_marks: 15, duration_minutes: 90,
      question_mix: [{ type: 'mcq', marks_each: 1, count: 5 }, { type: 'short_answer', marks_each: 5, count: 2 }],
      additional_instructions: null,
    })

    const prompt = await screen.findByLabelText('Paper prompt')
    expect(prompt).toHaveValue('Generate a unit test question paper for:\nBoard: CBSE')
    fireEvent.change(prompt, { target: { value: 'Edited prompt' } })
    fireEvent.click(screen.getByRole('button', { name: 'Generate paper' }))
    await waitFor(() => expect(teacherApi.generatePaper).toHaveBeenCalledWith('Edited prompt', expect.objectContaining({ board_code: 'CBSE' })))
    const preview = await screen.findByTestId('exam-preview')
    expect(preview).toHaveTextContent('Which is rational?')
    expect(preview).toHaveTextContent('Section A – MCQ')

    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }))
    await waitFor(() => expect(teacherApi.generatePaper).toHaveBeenCalledTimes(2))

    fireEvent.click(screen.getByRole('button', { name: 'Save & push to students' }))
    await waitFor(() => expect(teacherApi.savePaper).toHaveBeenCalledWith({
      title: paper.title, subject: 'Mathematics', grade: 8, board_code: 'CBSE', instructions: paper.instructions,
      duration_minutes: 90, total_marks: 15, sections: paper.sections, class_id: null,
    }))
    expect(await screen.findByRole('heading', { name: 'Paper saved' })).toBeInTheDocument()
    expect(screen.getByText(/1 question pushed to students/)).toBeInTheDocument()
  })
})
