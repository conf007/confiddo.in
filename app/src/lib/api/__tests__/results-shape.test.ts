/**
 * Backend fix A-06 (2026-09): the student results payload no longer carries
 * correct_count / incorrect_count / score_percentage, and the web UI must not
 * reconstruct or display any aggregate. Pins both halves of the golden rule:
 *  - the type/shape carries no score keys;
 *  - ResultsPage source contains no count/percentage/score-banded copy.
 */
import { describe, expect, it } from 'vitest'
import type { SessionResults } from '../sessions'
// Vite `?raw` import: the page source as a string (vite/client types declare '*?raw').
import resultsPageSource from '../../../pages/student/ResultsPage.tsx?raw'

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

describe('student results golden rule (A-06)', () => {
  const results: SessionResults = {
    session_id: 's',
    test_id: 't',
    total_questions: 4,
    attempts: [attempt(1, true), attempt(2, false), attempt(3, true), attempt(4, false)],
    incorrect_question_numbers: [2, 4],
  }

  it('carries no aggregate score keys', () => {
    const banned = ['correct_count', 'incorrect_count', 'score_percentage', 'accuracy']
    for (const key of banned) expect(key in results).toBe(false)
  })

  it('ResultsPage never renders a count, percentage or score-banded headline', () => {
    const src = resultsPageSource
    for (const forbidden of [
      'correctCount',
      'You got',
      'ratio',
      'headline(',
      'score_percentage',
      '.filter((a) => a.is_correct).length',
    ]) {
      expect(src.includes(forbidden), `ResultsPage.tsx must not contain "${forbidden}"`).toBe(false)
    }
  })
})
