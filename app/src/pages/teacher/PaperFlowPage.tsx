/**
 * /teacher/paper/new — 3-step paper builder (Flutter parity:
 * create_practice_screen.dart → question_review_screen.dart → publish).
 *
 * Step 1 Configure: class + question-bank chapters + difficulty
 *        (Easy | Mixed | Hard) with the server's distribution preview
 *        (question_bank_service.py:812-826 — 10Q = 10S / 6S+4M / 5S+3M+2H).
 * Step 2 Preview:   generated questions with per-question replace from the
 *        SAME difficulty pool (POST /teacher/paper/{id}/reject-question).
 * Step 3 Confirm:   draft already saved server-side — publish makes it live.
 *        The deadline shown is the SERVER-returned one (Sunday of next week
 *        23:59:59, models/test.py:16-26) — never recomputed client-side.
 *
 * Endpoints: teacher.py:1326 (chapters), :811 (generate-and-draft),
 * :828 (reject-question), :852 (review-state), :868 (review resume),
 * :902 (publish), :940 (reset).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Icon } from '../../components/icons'
import { LoadingState } from '../../components/teacher/PageState'
import { teacherKeys } from '../../components/teacher/hooks'
import {
  distributionFor,
  generateAndDraft,
  getDraftReview,
  getQuestionBankChapters,
  getTeacherClasses,
  publishDraftTest,
  rejectAndReplaceQuestion,
  resetDraftTest,
  updateReviewState,
  type DraftReview,
  type GenerateAndDraftConfig,
  type PaperDifficulty,
  type PaperQuestion,
  type PublishResult,
} from '../../lib/api/teacher'
import { friendlyError } from '../../lib/api/errors'

const TARGET_QUESTIONS = 10 // mirrors create_practice_screen.dart:219
const DIFFICULTIES: { value: PaperDifficulty; label: string; hint: string }[] = [
  { value: 'Easy', label: 'Easy', hint: 'Confidence building' },
  { value: 'Mixed', label: 'Mixed', hint: 'Balanced practice' },
  { value: 'Hard', label: 'Hard', hint: 'Stretch challenge' },
]

function StepDots({ step }: { step: 1 | 2 | 3 }) {
  const steps = ['Configure', 'Preview questions', 'Confirm & publish']
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3
        const active = n === step
        const done = n < step
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={[
                'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold',
                done
                  ? 'bg-success text-white'
                  : active
                    ? 'bg-primary text-white'
                    : 'bg-slate-200 text-ink-muted',
              ].join(' ')}
            >
              {done ? <Icon name="check" className="h-3 w-3" /> : n}
            </span>
            <span className={active ? 'font-semibold text-ink' : 'text-ink-muted'}>
              {label}
            </span>
            {i < steps.length - 1 && <span className="text-slate-300">—</span>}
          </li>
        )
      })}
    </ol>
  )
}

function QuestionCard({
  question,
  index,
  onReplace,
  replacing,
}: {
  question: PaperQuestion
  index: number
  onReplace: () => void
  replacing: boolean
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-tint text-xs font-semibold text-primary">
            {index + 1}
          </span>
          {question.difficulty && <Badge tone="outline">{question.difficulty}</Badge>}
          {question.topic && <Badge tone="neutral">{question.topic}</Badge>}
        </div>
        <Button size="sm" variant="ghost" onClick={onReplace} loading={replacing}>
          Replace
        </Button>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink">{question.text}</p>
      {question.options && question.options.length > 0 && (
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {question.options.map((opt, i) => (
            <li
              key={i}
              className="rounded-lg border border-slate-100 bg-surface px-3 py-2 text-xs text-ink-soft"
            >
              <span className="mr-1.5 font-semibold text-ink-muted">
                {String.fromCharCode(65 + i)}.
              </span>
              {opt}
            </li>
          ))}
        </ul>
      )}
      {question.expected_answer && (
        <p className="mt-2.5 text-xs text-success">
          <span className="font-semibold">Answer:</span> {question.expected_answer}
        </p>
      )}
    </Card>
  )
}

export function PaperFlowPage() {
  const [params, setParams] = useSearchParams()
  const resumeTestId = params.get('testId')
  const preselectClassId = params.get('classId')

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [classId, setClassId] = useState(preselectClassId ?? '')
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState<PaperDifficulty>('Mixed')
  const [draft, setDraft] = useState<DraftReview | null>(null)
  const [questionsById, setQuestionsById] = useState<Record<string, PaperQuestion>>({})
  const [replacingId, setReplacingId] = useState<string | null>(null)
  const [bankExhausted, setBankExhausted] = useState(false)
  const [published, setPublished] = useState<PublishResult | null>(null)
  const [lastConfig, setLastConfig] = useState<GenerateAndDraftConfig | null>(null)

  const classes = useQuery({ queryKey: teacherKeys.classes, queryFn: getTeacherClasses })
  const chapters = useQuery({
    queryKey: teacherKeys.bankChapters(classId || undefined),
    queryFn: () => getQuestionBankChapters(classId || undefined),
    enabled: !!classId,
  })

  const selectedClass = classes.data?.classes.find((c) => c.id === classId)

  const adoptDraft = (data: DraftReview) => {
    setDraft(data)
    setQuestionsById((prev) => {
      const next = { ...prev }
      for (const q of data.questions) next[q.id] = q
      return next
    })
    setStep(data.review_state?.review_phase === 'final_draft' ? 3 : 2)
  }

  // Resume an existing draft (?testId= from the dashboard "Continue" task).
  // A one-shot mutation (not a query) so adopting the draft into wizard
  // state happens in onSuccess, not in an effect.
  const resume = useMutation({ mutationFn: getDraftReview, onSuccess: adoptDraft })
  const resumeStarted = useRef(false)
  const resumeMutate = resume.mutate
  useEffect(() => {
    if (resumeTestId && !resumeStarted.current) {
      resumeStarted.current = true
      resumeMutate(resumeTestId)
    }
  }, [resumeTestId, resumeMutate])

  const generate = useMutation({
    mutationFn: generateAndDraft,
    onSuccess: (data) => {
      setBankExhausted(false)
      adoptDraft(data)
    },
  })

  const replace = useMutation({
    mutationFn: ({ testId, questionId }: { testId: string; questionId: string }) =>
      rejectAndReplaceQuestion(testId, questionId),
    onSuccess: (data) => {
      setBankExhausted(data.bank_exhausted)
      setDraft((prev) => (prev ? { ...prev, review_state: data.review_state } : prev))
      if (data.replacement) {
        const r = data.replacement
        setQuestionsById((prev) => ({ ...prev, [r.id]: r }))
      }
    },
    onSettled: () => setReplacingId(null),
  })

  const confirmQuestions = useMutation({
    mutationFn: () =>
      updateReviewState(draft!.test_id, {
        review_phase: 'final_draft',
        current_index: draft!.review_state.slot_question_ids.length,
      }),
    onSuccess: (data) => {
      setDraft((prev) => (prev ? { ...prev, review_state: data.review_state } : prev))
      setStep(3)
    },
  })

  const publish = useMutation({
    mutationFn: () => publishDraftTest(draft!.test_id),
    onSuccess: (data) => setPublished(data),
  })

  const discard = useMutation({
    mutationFn: () => resetDraftTest(draft!.test_id),
    onSuccess: () => {
      setDraft(null)
      setQuestionsById({})
      setStep(1)
      if (resumeTestId) setParams({}, { replace: true })
    },
  })

  const buildConfig = (forceNew: boolean): GenerateAndDraftConfig => {
    const subject = selectedClass?.subject || 'Mathematics'
    const grade = Number.parseInt(selectedClass?.grade ?? '', 10) || 10
    const selected = (chapters.data?.chapters ?? []).filter((c) =>
      selectedBankIds.includes(c.bank_id),
    )
    const now = new Date()
    const dd = String(now.getDate()).padStart(2, '0')
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const h12 = now.getHours() % 12 || 12
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM'
    const title = `${subject} Quiz - ${dd}/${mm}, ${h12}:${String(now.getMinutes()).padStart(2, '0')} ${ampm}`
    // Payload mirrors create_practice_screen.dart:230-247
    return {
      source: 'question_bank',
      bank_ids: selectedBankIds,
      difficulty,
      total_questions: TARGET_QUESTIONS,
      target_count: TARGET_QUESTIONS,
      title,
      duration: 20,
      class_id: classId || null,
      board_code: chapters.data?.board || 'CBSE',
      grade,
      subject_code: subject.toLowerCase(),
      subject_name: subject,
      chapter_names: selected.map((c) => c.chapter_name),
      paper_type: 'practice',
      force_new: forceNew,
    }
  }

  const onGenerate = (forceNew: boolean) => {
    const config = buildConfig(forceNew)
    setLastConfig(config)
    generate.mutate(config)
  }

  const slotQuestions = useMemo(() => {
    if (!draft) return []
    return draft.review_state.slot_question_ids
      .map((id) => questionsById[id])
      .filter((q): q is PaperQuestion => !!q)
  }, [draft, questionsById])

  const dist = distributionFor(difficulty, TARGET_QUESTIONS)

  // ── Published success screen ──────────────────────────────────────
  if (published) {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-tint text-success">
          <Icon name="check" className="h-8 w-8" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-ink">Test published</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            “{published.title}” is now live for your students.
          </p>
          {published.deadline && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary-tint px-4 py-2 text-sm font-medium text-primary">
              Due{' '}
              {new Date(published.deadline).toLocaleString(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
        <div className="flex justify-center gap-3">
          <Link to={`/teacher/tests/${published.test_id}`}>
            <Button>View test status</Button>
          </Link>
          <Link to="/teacher">
            <Button variant="secondary">Back to classes</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (resumeTestId && !draft && resume.isPending) return <LoadingState />

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Create a test</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Build a 10-question practice test from your school's question bank.
        </p>
      </div>
      <StepDots step={step} />

      {resume.isError && !draft && (
        <p className="rounded-xl bg-band-red/5 px-4 py-3 text-sm text-band-red">
          {friendlyError(resume.error, "We couldn't load that draft.")} You can
          configure a new test below.
        </p>
      )}

      {/* ── Step 1: Configure ──────────────────────────────────────── */}
      {step === 1 && (
        <Card className="space-y-5">
          <div>
            <label htmlFor="paper-class" className="mb-1.5 block text-sm font-medium text-ink-soft">
              Class
            </label>
            <select
              id="paper-class"
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value)
                setSelectedBankIds([])
              }}
              className="h-12 w-full rounded-xl border border-slate-200 bg-card px-4 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            >
              <option value="">Choose a class…</option>
              {classes.data?.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — Grade {c.grade}, {c.subject}
                </option>
              ))}
            </select>
          </div>

          {classId && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink-soft">Chapters</p>
              {chapters.isLoading ? (
                <p className="text-sm text-ink-muted">Loading chapters…</p>
              ) : (chapters.data?.chapters.length ?? 0) === 0 ? (
                <p className="rounded-xl bg-surface px-4 py-3 text-sm text-ink-muted">
                  No question banks are available for this class yet. Ask your
                  admin to upload chapter banks.
                </p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {chapters.data!.chapters.map((ch) => {
                    const checked = selectedBankIds.includes(ch.bank_id)
                    return (
                      <li key={ch.bank_id}>
                        <label
                          className={[
                            'flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors select-none',
                            checked
                              ? 'border-primary bg-primary-tint text-ink'
                              : 'border-slate-200 bg-card text-ink-soft hover:border-slate-300',
                          ].join(' ')}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedBankIds((prev) =>
                                checked
                                  ? prev.filter((id) => id !== ch.bank_id)
                                  : [...prev, ch.bank_id],
                              )
                            }
                            className="h-4 w-4 accent-[var(--color-primary)]"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                              {ch.chapter_number}. {ch.chapter_name}
                            </span>
                            <span className="block text-xs text-ink-muted">
                              {ch.total_questions} questions
                            </span>
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-soft">Difficulty</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {DIFFICULTIES.map((d) => (
                <label
                  key={d.value}
                  className={[
                    'flex min-h-12 cursor-pointer flex-col justify-center rounded-xl border px-4 py-2.5 transition-colors select-none',
                    difficulty === d.value
                      ? 'border-primary bg-primary-tint'
                      : 'border-slate-200 bg-card hover:border-slate-300',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="difficulty"
                    value={d.value}
                    checked={difficulty === d.value}
                    onChange={() => setDifficulty(d.value)}
                    className="sr-only"
                  />
                  <span className="text-sm font-semibold text-ink">{d.label}</span>
                  <span className="text-xs text-ink-muted">{d.hint}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              {TARGET_QUESTIONS} questions: {dist.simple} Simple
              {dist.medium > 0 && ` + ${dist.medium} Medium`}
              {dist.hard > 0 && ` + ${dist.hard} Hard`}
            </p>
          </div>

          {generate.error && (
            <p className="text-sm text-band-red">{friendlyError(generate.error)}</p>
          )}

          <div className="flex justify-end">
            <Button
              onClick={() => onGenerate(false)}
              loading={generate.isPending}
              disabled={!classId || selectedBankIds.length === 0}
            >
              Generate questions
            </Button>
          </div>
        </Card>
      )}

      {/* ── Step 2: Preview & replace ──────────────────────────────── */}
      {step === 2 && draft && (
        <>
          {draft.existing_draft && (
            <Card className="flex flex-wrap items-center justify-between gap-3 border border-accent/20 bg-accent-tint/40">
              <p className="text-sm text-ink-soft">
                You already had a draft for this class — continuing where you
                left off.
              </p>
              {lastConfig && (
                <Button
                  size="sm"
                  variant="ghost"
                  loading={generate.isPending}
                  onClick={() => onGenerate(true)}
                >
                  Start fresh instead
                </Button>
              )}
            </Card>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-ink-soft">
              <span className="font-semibold text-ink">{slotQuestions.length}</span>{' '}
              questions ready
              {draft.config?.class_name && ` for ${draft.config.class_name}`}
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => discard.mutate()}
              loading={discard.isPending}
            >
              Discard draft
            </Button>
          </div>

          {bankExhausted && (
            <p className="rounded-xl bg-gold-tint px-4 py-3 text-sm text-amber-700">
              The question pool for this difficulty is exhausted — no more
              replacements are available for that question.
            </p>
          )}
          {replace.error && (
            <p className="text-sm text-band-red">{friendlyError(replace.error)}</p>
          )}

          <div className="space-y-4">
            {slotQuestions.map((q, i) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={i}
                replacing={replacingId === q.id}
                onReplace={() => {
                  setReplacingId(q.id)
                  replace.mutate({ testId: draft.test_id, questionId: q.id })
                }}
              />
            ))}
          </div>

          {confirmQuestions.error && (
            <p className="text-sm text-band-red">
              {friendlyError(confirmQuestions.error)}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button
              onClick={() => confirmQuestions.mutate()}
              loading={confirmQuestions.isPending}
              disabled={slotQuestions.length === 0}
            >
              Looks good — continue
            </Button>
          </div>
        </>
      )}

      {/* ── Step 3: Confirm & publish ──────────────────────────────── */}
      {step === 3 && draft && (
        <Card className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              {draft.title || 'Practice test'}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {draft.config?.class_name && `${draft.config.class_name} • `}
              {draft.config?.subject_name ?? 'Mathematics'} •{' '}
              {draft.review_state.slot_question_ids.length} questions
            </p>
          </div>
          <div className="rounded-xl bg-surface px-4 py-3 text-sm leading-relaxed text-ink-soft">
            Your draft is saved. Publishing makes the test live for every
            student in the class and sets the deadline to the Sunday of next
            week at 23:59 — you'll see the exact date once it's published.
          </div>
          {publish.error && (
            <p className="text-sm text-band-red">{friendlyError(publish.error)}</p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="ghost" onClick={() => setStep(2)}>
              Back to questions
            </Button>
            <Link to="/teacher/tests">
              <Button variant="secondary">Keep as draft</Button>
            </Link>
            <Button onClick={() => publish.mutate()} loading={publish.isPending}>
              Publish to students
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
