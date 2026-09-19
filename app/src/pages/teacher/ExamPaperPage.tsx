import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Icon } from '../../components/icons'
import { teacherKeys } from '../../components/teacher/hooks'
import {
  generatePaper,
  generatePaperPrompt,
  getBlueprints,
  getSyllabusBoards,
  getSyllabusChapters,
  getSyllabusSubjects,
  getTeacherClasses,
  savePaper,
  type ExamPaper,
  type ExamPaperType,
  type ExamQuestionType,
  type GeneratePromptRequest,
  type PaperBlueprint,
  type QuestionMixItem,
  type SavePaperResult,
  type SyllabusBoard,
  type SyllabusSubject,
} from '../../lib/api/teacher'
import { friendlyError } from '../../lib/api/errors'

const GRADES = [8, 9, 10]
const PAPER_TYPES: { value: ExamPaperType; label: string }[] = [
  { value: 'unit_test', label: 'Unit test' },
  { value: 'half_yearly', label: 'Half yearly' },
  { value: 'annual', label: 'Annual exam' },
  { value: 'practice', label: 'Practice paper' },
]
const QUESTION_TYPES: { value: ExamQuestionType; label: string; short: string }[] = [
  { value: 'mcq', label: 'MCQ', short: 'MCQ' },
  { value: 'short_answer', label: 'Short answer', short: 'Short' },
  { value: 'short_answer_i', label: 'Short answer I', short: 'Short I' },
  { value: 'short_answer_ii', label: 'Short answer II', short: 'Short II' },
  { value: 'long_answer', label: 'Long answer', short: 'Long' },
  { value: 'case_based', label: 'Case based', short: 'Case' },
  { value: 'assertion_reason', label: 'Assertion–reason', short: 'A&R' },
  { value: 'fill_blanks', label: 'Fill in the blanks', short: 'Fill' },
]
const VALID_TYPES = new Set<string>(QUESTION_TYPES.map((t) => t.value))

const FIELD =
  'h-12 w-full rounded-xl border border-slate-200 bg-card px-4 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50'

function mixFromBlueprint(bp: PaperBlueprint | undefined): QuestionMixItem[] {
  if (!bp?.default_question_mix) return []
  try {
    const raw = JSON.parse(bp.default_question_mix) as unknown
    if (!Array.isArray(raw)) return []
    return raw.map((m) => {
      const item = m as { type?: string; marks_each?: number; marks?: number; count?: number }
      const type = item.type && VALID_TYPES.has(item.type) ? (item.type as ExamQuestionType) : 'short_answer'
      return { type, marks_each: item.marks_each ?? item.marks ?? 1, count: item.count ?? 1 }
    })
  } catch {
    return []
  }
}

function paperToText(paper: ExamPaper): string {
  const lines = [
    paper.title,
    `Duration: ${paper.duration_minutes} minutes | Total marks: ${paper.total_marks}`,
    '',
    paper.instructions,
    '',
  ]
  for (const section of paper.sections) {
    lines.push(section.name, '-'.repeat(section.name.length))
    for (const q of section.questions) {
      lines.push(`Q${q.number}. [${q.marks} marks] ${q.text}`)
      for (const [i, opt] of (q.options ?? []).entries()) {
        lines.push(`  ${String.fromCharCode(97 + i)}) ${opt}`)
      }
      lines.push('')
    }
  }
  return lines.join('\n')
}

function StepDots({ step }: { step: 1 | 2 | 3 }) {
  const steps = ['Configure', 'Review prompt', 'Preview & save']
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
                done ? 'bg-success text-white' : active ? 'bg-primary text-white' : 'bg-slate-200 text-ink-muted',
              ].join(' ')}
            >
              {done ? <Icon name="check" className="h-3 w-3" /> : n}
            </span>
            <span className={active ? 'font-semibold text-ink' : 'text-ink-muted'}>{label}</span>
            {i < steps.length - 1 && <span className="text-slate-300">—</span>}
          </li>
        )
      })}
    </ol>
  )
}

function PaperPreview({ paper }: { paper: ExamPaper }) {
  return (
    <div className="space-y-4" data-testid="exam-preview">
      <Card className="text-center">
        <h2 className="text-lg font-semibold text-ink">{paper.title}</h2>
        <p className="mt-2 flex justify-center gap-2 text-xs text-ink-muted">
          <Badge tone="neutral">{paper.duration_minutes} min</Badge>
          <Badge tone="neutral">{paper.total_marks} marks</Badge>
        </p>
        <p className="mt-3 text-xs leading-relaxed whitespace-pre-line text-ink-muted">{paper.instructions}</p>
      </Card>
      {paper.sections.map((section) => (
        <div key={section.name}>
          <p className="mb-2 rounded-xl bg-primary-tint px-4 py-2 text-sm font-semibold text-primary">
            {section.name}
          </p>
          <ol className="space-y-2">
            {section.questions.map((q) => (
              <li key={q.number} className="rounded-xl border border-slate-100 bg-card p-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-ink">Q{q.number}.</span>
                  <Badge tone="outline">
                    {QUESTION_TYPES.find((t) => t.value === q.type)?.short ?? q.type}
                  </Badge>
                  <span className="ml-auto text-ink-muted">[{q.marks} marks]</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink">{q.text}</p>
                {q.options && q.options.length > 0 && (
                  <ul className="mt-2 space-y-1 pl-4 text-xs text-ink-soft">
                    {q.options.map((opt, i) => (
                      <li key={i}>
                        {String.fromCharCode(97 + i)}) {opt}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  )
}

export function ExamPaperPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [board, setBoard] = useState<SyllabusBoard | null>(null)
  const [grade, setGrade] = useState<number | null>(null)
  const [subject, setSubject] = useState<SyllabusSubject | null>(null)
  const [chapterIds, setChapterIds] = useState<ReadonlySet<string>>(() => new Set())
  const [paperType, setPaperType] = useState<ExamPaperType | null>(null)
  const [mix, setMix] = useState<QuestionMixItem[]>([])
  const [instructions, setInstructions] = useState('')
  const [classId, setClassId] = useState('')
  const [config, setConfig] = useState<GeneratePromptRequest | null>(null)
  const [prompt, setPrompt] = useState('')
  const [paper, setPaper] = useState<ExamPaper | null>(null)
  const [saved, setSaved] = useState<SavePaperResult | null>(null)
  const [copied, setCopied] = useState<'done' | 'failed' | null>(null)

  const boards = useQuery({ queryKey: teacherKeys.syllabusBoards, queryFn: getSyllabusBoards })
  const classes = useQuery({ queryKey: teacherKeys.classes, queryFn: getTeacherClasses })
  const subjects = useQuery({
    queryKey: teacherKeys.syllabusSubjects(board?.id ?? '', grade ?? 0),
    queryFn: () => getSyllabusSubjects(board!.id, grade!),
    enabled: !!board && grade !== null,
  })
  const chapters = useQuery({
    queryKey: teacherKeys.syllabusChapters(subject?.id ?? ''),
    queryFn: () => getSyllabusChapters(subject!.id),
    enabled: !!subject,
  })
  const blueprints = useQuery({
    queryKey: teacherKeys.blueprints(board?.code ?? ''),
    queryFn: () => getBlueprints(board!.code),
    enabled: !!board,
  })

  const blueprint = blueprints.data?.blueprints.find((b) => b.paper_type === paperType)
  const totalMarks = mix.reduce((sum, m) => sum + m.marks_each * m.count, 0)
  const canGenerate =
    !!board && grade !== null && !!subject && chapterIds.size > 0 && !!paperType && mix.length > 0

  const buildPrompt = useMutation({
    mutationFn: (req: GeneratePromptRequest) => generatePaperPrompt(req),
    onSuccess: (data, req) => {
      setConfig(req)
      setPrompt(data.prompt_text)
      setStep(2)
    },
  })
  const generate = useMutation({
    mutationFn: () => generatePaper(prompt.trim(), config),
    onSuccess: (data) => {
      setPaper(data)
      setStep(3)
    },
  })
  const save = useMutation({
    mutationFn: () =>
      savePaper({
        title: paper!.title,
        subject: config?.subject_name ?? paper!.subject ?? 'General',
        grade: config?.grade ?? 10,
        board_code: config?.board_code ?? '',
        instructions: paper!.instructions,
        duration_minutes: paper!.duration_minutes,
        total_marks: paper!.total_marks,
        sections: paper!.sections,
        class_id: classId || null,
      }),
    onSuccess: setSaved,
  })

  const onGeneratePrompt = () => {
    if (!canGenerate) return
    const names = (chapters.data?.chapters ?? [])
      .filter((c) => chapterIds.has(c.id))
      .map((c) => c.name)
    buildPrompt.mutate({
      board_code: board!.code,
      grade: grade!,
      subject_code: subject!.code,
      subject_name: subject!.name,
      chapter_names: names,
      paper_type: paperType!,
      total_marks: totalMarks,
      duration_minutes: blueprint?.duration_minutes ?? 180,
      question_mix: mix,
      additional_instructions: instructions.trim() || null,
    })
  }

  const copyPaper = async () => {
    if (!paper) return
    try {
      await navigator.clipboard.writeText(paperToText(paper))
      setCopied('done')
    } catch {
      setCopied('failed')
    }
    window.setTimeout(() => setCopied(null), 2500)
  }

  const updateMix = (i: number, patch: Partial<QuestionMixItem>) =>
    setMix((prev) => prev.map((m, j) => (j === i ? { ...m, ...patch } : m)))

  if (saved) {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-tint text-success">
          <Icon name="check" className="h-8 w-8" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-ink">Paper saved</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            “{saved.title}” — {saved.total_questions} question{saved.total_questions === 1 ? '' : 's'} pushed to students.
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <Link to={`/teacher/tests/${saved.test_id}`}>
            <Button>View test status</Button>
          </Link>
          <Link to="/teacher">
            <Button variant="secondary">Back to classes</Button>
          </Link>
        </div>
      </div>
    )
  }

  const chapterGroups = new Map<string, { id: string; chapter_number: number; name: string }[]>()
  for (const c of chapters.data?.chapters ?? []) {
    const unit = c.unit_name ?? 'General'
    chapterGroups.set(unit, [...(chapterGroups.get(unit) ?? []), c])
  }
  const allChapterIds = (chapters.data?.chapters ?? []).map((c) => c.id)
  const allSelected = allChapterIds.length > 0 && allChapterIds.every((id) => chapterIds.has(id))

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Exam paper builder</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Board syllabus → prompt → generated paper, ready to push to students.
          </p>
        </div>
        <Link to="/teacher/paper/new" className="text-xs font-medium text-primary hover:text-primary-light">
          Quick 10-question test instead
        </Link>
      </div>
      <StepDots step={step} />

      {step === 1 && (
        <Card className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="exam-board" className="mb-1.5 block text-sm font-medium text-ink-soft">
                Board
              </label>
              <select
                id="exam-board"
                value={board?.id ?? ''}
                onChange={(e) => {
                  setBoard(boards.data?.boards.find((b) => b.id === e.target.value) ?? null)
                  setGrade(null)
                  setSubject(null)
                  setChapterIds(new Set())
                  setPaperType(null)
                  setMix([])
                }}
                className={FIELD}
              >
                <option value="">Choose a board…</option>
                {boards.data?.boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {boards.data && boards.data.boards.length === 0 && (
                <p className="mt-1.5 text-xs text-ink-muted">No syllabus boards set up yet.</p>
              )}
            </div>
            <div>
              <label htmlFor="exam-grade" className="mb-1.5 block text-sm font-medium text-ink-soft">
                Grade
              </label>
              <select
                id="exam-grade"
                value={grade ?? ''}
                disabled={!board}
                onChange={(e) => {
                  setGrade(e.target.value ? Number(e.target.value) : null)
                  setSubject(null)
                  setChapterIds(new Set())
                }}
                className={FIELD}
              >
                <option value="">Choose a grade…</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    Class {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="exam-subject" className="mb-1.5 block text-sm font-medium text-ink-soft">
                Subject
              </label>
              <select
                id="exam-subject"
                value={subject?.id ?? ''}
                disabled={grade === null}
                onChange={(e) => {
                  setSubject(subjects.data?.subjects.find((s) => s.id === e.target.value) ?? null)
                  setChapterIds(new Set())
                }}
                className={FIELD}
              >
                <option value="">Choose a subject…</option>
                {subjects.data?.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="exam-type" className="mb-1.5 block text-sm font-medium text-ink-soft">
                Paper type
              </label>
              <select
                id="exam-type"
                value={paperType ?? ''}
                disabled={!board}
                onChange={(e) => {
                  const t = (e.target.value || null) as ExamPaperType | null
                  setPaperType(t)
                  setMix(mixFromBlueprint(blueprints.data?.blueprints.find((b) => b.paper_type === t)))
                }}
                className={FIELD}
              >
                <option value="">Choose a paper type…</option>
                {PAPER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-sm font-medium text-ink-soft">Chapters</p>
              {allChapterIds.length > 0 && (
                <span className="flex items-center gap-3 text-xs text-ink-muted">
                  {chapterIds.size}/{allChapterIds.length} selected
                  <button
                    type="button"
                    onClick={() => setChapterIds(allSelected ? new Set() : new Set(allChapterIds))}
                    className="font-medium text-primary hover:text-primary-light"
                  >
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </button>
                </span>
              )}
            </div>
            {!subject ? (
              <p className="text-sm text-ink-muted">Pick a subject first.</p>
            ) : chapters.isLoading ? (
              <p className="text-sm text-ink-muted">Loading chapters…</p>
            ) : allChapterIds.length === 0 ? (
              <p className="text-sm text-ink-muted">No chapters listed for this subject.</p>
            ) : (
              <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                {Array.from(chapterGroups.entries()).map(([unit, list]) => (
                  <div key={unit}>
                    <p className="mb-1.5 text-xs font-semibold text-ink-muted">{unit}</p>
                    <ul className="flex flex-wrap gap-2">
                      {list.map((c) => {
                        const on = chapterIds.has(c.id)
                        return (
                          <li key={c.id}>
                            <label
                              className={[
                                'inline-flex min-h-10 cursor-pointer items-center rounded-xl border px-3 text-xs font-medium select-none',
                                on
                                  ? 'border-primary bg-primary-tint text-primary'
                                  : 'border-slate-200 bg-card text-ink-soft hover:border-slate-300',
                              ].join(' ')}
                            >
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={on}
                                onChange={() =>
                                  setChapterIds((prev) => {
                                    const next = new Set(prev)
                                    if (on) next.delete(c.id)
                                    else next.add(c.id)
                                    return next
                                  })
                                }
                              />
                              {c.chapter_number}. {c.name}
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-sm font-medium text-ink-soft">Question mix</p>
              <p className="text-xs font-semibold text-ink">Total: {totalMarks} marks</p>
            </div>
            <div className="space-y-2">
              {mix.map((m, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2" data-testid="mix-row">
                  <select
                    aria-label={`Question type ${i + 1}`}
                    value={m.type}
                    onChange={(e) => updateMix(i, { type: e.target.value as ExamQuestionType })}
                    className={`${FIELD} h-10 min-w-40 flex-1`}
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                    Marks
                    <input
                      type="number"
                      min={1}
                      aria-label={`Marks each ${i + 1}`}
                      value={m.marks_each}
                      onChange={(e) => updateMix(i, { marks_each: Math.max(1, Number(e.target.value) || 1) })}
                      className={`${FIELD} h-10 w-20`}
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                    Count
                    <input
                      type="number"
                      min={1}
                      aria-label={`Count ${i + 1}`}
                      value={m.count}
                      onChange={(e) => updateMix(i, { count: Math.max(1, Number(e.target.value) || 1) })}
                      className={`${FIELD} h-10 w-20`}
                    />
                  </label>
                  <button
                    type="button"
                    aria-label={`Remove row ${i + 1}`}
                    onClick={() => setMix((prev) => prev.filter((_, j) => j !== i))}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-band-red hover:bg-band-red/10"
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-2"
              onClick={() => setMix((prev) => [...prev, { type: 'mcq', marks_each: 1, count: 1 }])}
            >
              Add row
            </Button>
          </div>

          <div>
            <label htmlFor="exam-class" className="mb-1.5 block text-sm font-medium text-ink-soft">
              Push to class (optional)
            </label>
            <select id="exam-class" value={classId} onChange={(e) => setClassId(e.target.value)} className={FIELD}>
              <option value="">Match by subject and grade</option>
              {classes.data?.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — Grade {c.grade}, {c.subject}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="exam-notes" className="mb-1.5 block text-sm font-medium text-ink-soft">
              Additional instructions (optional)
            </label>
            <textarea
              id="exam-notes"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder="e.g. focus on application-based questions"
              className="w-full rounded-xl border border-slate-200 bg-card px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          {buildPrompt.error && (
            <p className="text-sm text-band-red">{friendlyError(buildPrompt.error)}</p>
          )}
          <div className="flex justify-end">
            <Button onClick={onGeneratePrompt} loading={buildPrompt.isPending} disabled={!canGenerate}>
              Generate prompt
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="space-y-4">
          <p className="text-sm text-ink-muted">
            Built from your configuration. Edit anything before generating the paper.
          </p>
          <textarea
            aria-label="Paper prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={16}
            className="w-full rounded-xl border border-slate-200 bg-card px-4 py-3 font-mono text-xs leading-relaxed text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <p className="text-right text-xs text-ink-muted">{prompt.length} characters</p>
          {generate.error && <p className="text-sm text-band-red">{friendlyError(generate.error)}</p>}
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back to config
            </Button>
            <Button onClick={() => generate.mutate()} loading={generate.isPending} disabled={!prompt.trim()}>
              Generate paper
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && paper && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-ink-soft">
              <span className="font-semibold text-ink">
                {paper.sections.reduce((n, s) => n + s.questions.length, 0)}
              </span>{' '}
              questions in {paper.sections.length} section{paper.sections.length === 1 ? '' : 's'}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={copyPaper}>
                {copied === 'done' ? 'Copied' : copied === 'failed' ? 'Couldn’t copy' : 'Copy as text'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => generate.mutate()}
                loading={generate.isPending}
                disabled={save.isPending}
              >
                Regenerate
              </Button>
            </div>
          </div>
          <PaperPreview paper={paper} />
          {(generate.error || save.error) && (
            <p className="text-sm text-band-red">{friendlyError(generate.error ?? save.error)}</p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="ghost" onClick={() => setStep(2)}>
              Back to prompt
            </Button>
            <Button onClick={() => save.mutate()} loading={save.isPending} disabled={generate.isPending}>
              Save & push to students
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
