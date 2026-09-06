/**
 * Backend fix A-06 (2026-09): the student results payload no longer carries
 * correct_count / incorrect_count / score_percentage. The page derives the count
 * from per-question correctness instead. Pins the new shape so a regression in
 * either direction fails loudly.
 */
import { describe, expect, it } from 'vitest'
import { correctCount, type SessionResults } from '../sessions'

const attempt = (n: number, ok: boolean) => ({
  question_number: n,
  question_id: `q${n}`,
  question_text: `Q${n}`,
  selected_option_id: ok ? 'a' : 'b',
  selected_option_label: ok ? 'A' : 'B',
  correct_option_id: 'a',
  correct_option_label: 'A',
  is_correct: ok,
  hints_used: 0,
  solution_viewed: false,
  solution_viewed_after_correct: false,
})

describe('student results shape (A-06)', () => {
  const results: SessionResults = {
    session_id: 's',
    test_id: 't',
    total_questions: 4,
    attempts: [attempt(1, true), attempt(2, false), attempt(3, true), attempt(4, false)],
    incorrect_question_numbers: [2, 4],
  }

  it('derives the correct count from per-question correctness', () => {
    expect(correctCount(results)).toBe(2)
  })

  it('carries no aggregate score keys', () => {
    const banned = ['correct_count', 'incorrect_count', 'score_percentage', 'accuracy']
    for (const key of banned) expect(key in results).toBe(false)
  })
})
