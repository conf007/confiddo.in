/**
 * /teacher/students/:studentId[?classId=] — student detail (Flutter parity:
 * teacher_student_detail_screen.dart, student_trend_screen.dart,
 * teacher_notes_screen.dart, flag_student_screen.dart,
 * suggested_interventions_screen.dart, multi_subject_screen.dart,
 * parent_communication_screen.dart).
 *
 * Endpoints:
 *   GET  /teacher/students/{id}/trend          (teacher.py:262-273)
 *   GET  /teacher/students/{id}/subjects       (teacher.py:679-690)
 *   GET/POST /teacher/students/{id}/notes      (teacher.py:338-370)
 *   GET/POST /teacher/students/{id}/flags      (teacher.py:298-331)
 *   GET  /teacher/students/{id}/interventions  (teacher.py:643-654)
 *   POST /teacher/students/{id}/parent-message (teacher.py:603-621)
 *
 * Privacy: readiness words + self-history trend only — the teacher API
 * returns no raw scores for an individual student and none are shown.
 * Metric explainability is per-SUGGESTION (teacher.py:280), so it lives on
 * the review queue where a suggestion id exists, not here.
 */
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Icon } from '../../components/icons'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { ReadinessChip } from '../../components/teacher/ReadinessChip'
import { ReadinessSparkline } from '../../components/teacher/Sparkline'
import { teacherKeys } from '../../components/teacher/hooks'
import {
  createStudentFlag,
  createTeacherNote,
  getInterventions,
  getMultiSubjectView,
  getStudentFlags,
  getStudentTrend,
  getTeacherNotes,
  sendParentMessage,
  type FlagCategory,
  type ParentMessageTemplate,
} from '../../lib/api/teacher'
import { friendlyError } from '../../lib/api/errors'

const FLAG_LABELS: Record<FlagCategory, string> = {
  needs_conversation: 'Needs a conversation',
  potential_anxiety: 'Possible test anxiety',
  disengaged: 'Disengaged',
  excelling: 'Excelling',
}

const TEMPLATES: { value: ParentMessageTemplate; label: string; body: string }[] = [
  {
    value: 'positive_progress',
    label: 'Positive progress',
    body: 'I wanted to share that your child has been making encouraging progress in class — their consistency is paying off.',
  },
  {
    value: 'needs_support',
    label: 'Needs support',
    body: 'I have noticed your child could use a little extra encouragement at home this week. A few minutes of practice together would help.',
  },
  {
    value: 'check_in',
    label: 'Check-in',
    body: "Just checking in — please let me know if there's anything happening at home that might help me support your child better.",
  },
  { value: 'custom', label: 'Custom message', body: '' },
]

export function StudentDetailPage() {
  const { studentId = '' } = useParams()
  const [params] = useSearchParams()
  const classId = params.get('classId') ?? undefined
  const queryClient = useQueryClient()

  const trend = useQuery({
    queryKey: teacherKeys.studentTrend(studentId),
    queryFn: () => getStudentTrend(studentId),
    enabled: !!studentId,
  })
  const subjects = useQuery({
    queryKey: teacherKeys.studentSubjects(studentId),
    queryFn: () => getMultiSubjectView(studentId),
    enabled: !!studentId,
  })
  const notes = useQuery({
    queryKey: teacherKeys.studentNotes(studentId),
    queryFn: () => getTeacherNotes(studentId),
    enabled: !!studentId,
  })
  const flags = useQuery({
    queryKey: teacherKeys.studentFlags(studentId),
    queryFn: () => getStudentFlags(studentId),
    enabled: !!studentId,
  })
  const interventions = useQuery({
    queryKey: teacherKeys.interventions(studentId),
    queryFn: () => getInterventions(studentId),
    enabled: !!studentId,
  })

  // ── Note form ──────────────────────────────────────────────────────
  const [noteText, setNoteText] = useState('')
  const addNote = useMutation({
    mutationFn: () => createTeacherNote(studentId, noteText.trim(), classId),
    onSuccess: () => {
      setNoteText('')
      queryClient.invalidateQueries({ queryKey: teacherKeys.studentNotes(studentId) })
    },
  })

  // ── Flag form ──────────────────────────────────────────────────────
  const [showFlagForm, setShowFlagForm] = useState(false)
  const [flagCategory, setFlagCategory] = useState<FlagCategory>('needs_conversation')
  const [flagNote, setFlagNote] = useState('')
  const [notifyPrincipal, setNotifyPrincipal] = useState(false)
  const [notifyParent, setNotifyParent] = useState(false)
  const addFlag = useMutation({
    mutationFn: () =>
      createStudentFlag(
        studentId,
        {
          category: flagCategory,
          note: flagNote.trim() || undefined,
          notify_principal: notifyPrincipal,
          notify_parent: notifyParent,
        },
        classId,
      ),
    onSuccess: () => {
      setShowFlagForm(false)
      setFlagNote('')
      setNotifyPrincipal(false)
      setNotifyParent(false)
      queryClient.invalidateQueries({ queryKey: teacherKeys.studentFlags(studentId) })
    },
  })

  // ── Parent message form ────────────────────────────────────────────
  const [template, setTemplate] = useState<ParentMessageTemplate>('positive_progress')
  const [messageBody, setMessageBody] = useState(TEMPLATES[0].body)
  const [includeLevel, setIncludeLevel] = useState(true)
  const message = useMutation({
    mutationFn: () =>
      sendParentMessage(studentId, {
        template_type: template,
        message_body: messageBody.trim(),
        include_level: includeLevel,
      }),
  })

  if (trend.isLoading) return <LoadingState />
  if (!trend.data) {
    return (
      <ErrorState
        title="We couldn't load this student"
        error={trend.error}
        onRetry={() => trend.refetch()}
        icon="user"
      />
    )
  }

  const t = trend.data

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          to={classId ? `/teacher/classes/${classId}` : '/teacher'}
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink"
        >
          <Icon name="arrow-left" className="h-3.5 w-3.5" />
          Back
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-ink">{t.student_first_name}</h1>
          <ReadinessChip level={t.current_level} display={t.current_level_display} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trend — self-history only */}
        <Card>
          <h2 className="text-sm font-semibold text-ink">Readiness trend</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            {t.student_first_name}'s own journey, week by week — no peer
            comparison.
          </p>
          {t.weeks.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">
              No weekly history yet — it builds up as tests are reviewed.
            </p>
          ) : (
            <>
              <div className="mt-3">
                <ReadinessSparkline
                  points={t.weeks.map((w) => ({
                    label: w.week_start_date,
                    level: w.level,
                  }))}
                />
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                {t.weeks.slice(-4).map((w) => (
                  <li key={w.week_start_date}>
                    {new Date(w.week_start_date).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                    })}
                    : <span className="font-medium text-ink-soft">{w.level_display}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        {/* Subjects */}
        <Card>
          <h2 className="text-sm font-semibold text-ink">Across subjects</h2>
          {subjects.isLoading ? (
            <p className="mt-3 text-sm text-ink-muted">Loading…</p>
          ) : (subjects.data?.subjects.length ?? 0) === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">
              No other subjects tracked yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {subjects.data!.subjects.map((s) => (
                <li
                  key={s.class_id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-2.5"
                >
                  <span className="text-sm font-medium text-ink">{s.subject}</span>
                  <span className="flex items-center gap-2">
                    <ReadinessChip level={s.level} display={s.level_display} />
                    <span
                      className="text-xs text-ink-muted"
                      aria-label={`Trend: ${s.trend}`}
                    >
                      {s.trend === 'up' ? '↑' : s.trend === 'down' ? '↓' : '→'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {(subjects.data?.insights.length ?? 0) > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-ink-muted">
              {subjects.data!.insights.map((i, idx) => (
                <li key={idx}>• {i}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Interventions */}
      <Card>
        <h2 className="text-sm font-semibold text-ink">Suggested next steps</h2>
        {interventions.isLoading ? (
          <p className="mt-3 text-sm text-ink-muted">Loading…</p>
        ) : !interventions.data ? (
          <p className="mt-3 text-sm text-ink-muted">
            {friendlyError(interventions.error, 'Suggestions unavailable right now.')}
          </p>
        ) : (
          <>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {interventions.data.strategies.map((s) => (
                <div key={s.title} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{s.title}</p>
                    <Badge tone="outline">{s.effort} effort</Badge>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                    {s.description}
                  </p>
                </div>
              ))}
            </div>
            {interventions.data.general_tips.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-ink-muted">
                {interventions.data.general_tips.map((tip, i) => (
                  <li key={i}>• {tip}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Notes */}
        <Card>
          <h2 className="text-sm font-semibold text-ink">My notes</h2>
          <form
            className="mt-3 space-y-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (noteText.trim()) addNote.mutate()
            }}
          >
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              maxLength={1000}
              rows={2}
              placeholder="Add a private note about this student…"
              className="w-full rounded-xl border border-slate-200 bg-card px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            {addNote.error && (
              <p className="text-xs text-band-red">{friendlyError(addNote.error)}</p>
            )}
            <div className="flex justify-end">
              <Button
                size="sm"
                type="submit"
                loading={addNote.isPending}
                disabled={!noteText.trim()}
              >
                Save note
              </Button>
            </div>
          </form>
          <ul className="mt-3 space-y-2">
            {(notes.data?.notes ?? []).map((n) => (
              <li key={n.id} className="rounded-xl bg-surface px-4 py-3">
                <p className="text-sm leading-relaxed text-ink-soft">{n.content}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {new Date(n.created_at).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </li>
            ))}
            {notes.data && notes.data.notes.length === 0 && (
              <li className="text-sm text-ink-muted">No notes yet.</li>
            )}
          </ul>
        </Card>

        {/* Flags */}
        <Card>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">Flags</h2>
            <Button size="sm" variant="secondary" onClick={() => setShowFlagForm((v) => !v)}>
              {showFlagForm ? 'Cancel' : 'Flag student'}
            </Button>
          </div>
          {showFlagForm && (
            <form
              className="mt-3 space-y-3 rounded-xl bg-surface p-4"
              onSubmit={(e) => {
                e.preventDefault()
                addFlag.mutate()
              }}
            >
              <div>
                <label htmlFor="flag-category" className="mb-1.5 block text-xs font-medium text-ink-soft">
                  Category
                </label>
                <select
                  id="flag-category"
                  value={flagCategory}
                  onChange={(e) => setFlagCategory(e.target.value as FlagCategory)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-card px-4 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  {(Object.keys(FLAG_LABELS) as FlagCategory[]).map((c) => (
                    <option key={c} value={c}>
                      {FLAG_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={flagNote}
                onChange={(e) => setFlagNote(e.target.value)}
                rows={2}
                placeholder="Optional context…"
                className="w-full rounded-xl border border-slate-200 bg-card px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
              <label className="flex min-h-8 items-center gap-2 text-xs text-ink-soft">
                <input
                  type="checkbox"
                  checked={notifyPrincipal}
                  onChange={(e) => setNotifyPrincipal(e.target.checked)}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                Notify principal
              </label>
              <label className="flex min-h-8 items-center gap-2 text-xs text-ink-soft">
                <input
                  type="checkbox"
                  checked={notifyParent}
                  onChange={(e) => setNotifyParent(e.target.checked)}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                Notify parent
              </label>
              {addFlag.error && (
                <p className="text-xs text-band-red">{friendlyError(addFlag.error)}</p>
              )}
              <Button size="sm" type="submit" loading={addFlag.isPending}>
                Create flag
              </Button>
            </form>
          )}
          <ul className="mt-3 space-y-2">
            {(flags.data?.flags ?? []).map((f) => (
              <li key={f.id} className="rounded-xl bg-surface px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink">
                    {FLAG_LABELS[f.category as FlagCategory] ?? f.category}
                  </p>
                  <Badge tone="neutral">{f.status}</Badge>
                </div>
                {f.note && <p className="mt-1 text-xs text-ink-muted">{f.note}</p>}
                <p className="mt-1 text-xs text-ink-muted">
                  {new Date(f.created_at).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                  })}
                  {f.notify_principal && ' • principal notified'}
                  {f.notify_parent && ' • parent notified'}
                </p>
              </li>
            ))}
            {flags.data && flags.data.flags.length === 0 && (
              <li className="text-sm text-ink-muted">No flags raised.</li>
            )}
          </ul>
        </Card>
      </div>

      {/* Message parent */}
      <Card>
        <h2 className="text-sm font-semibold text-ink">Message the parent</h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          Effort-first language works best — readiness words, never marks.
        </p>
        {message.isSuccess ? (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-success-tint px-4 py-3 text-sm text-success">
            <Icon name="check" className="h-4 w-4" />
            Message sent to the parent.
          </p>
        ) : (
          <form
            className="mt-3 space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (messageBody.trim()) message.mutate()
            }}
          >
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((tpl) => (
                <label
                  key={tpl.value}
                  className={[
                    'inline-flex h-10 cursor-pointer items-center rounded-xl border px-3 text-xs font-medium transition-colors select-none',
                    template === tpl.value
                      ? 'border-primary bg-primary-tint text-primary'
                      : 'border-slate-200 bg-card text-ink-soft hover:border-slate-300',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="template"
                    className="sr-only"
                    checked={template === tpl.value}
                    onChange={() => {
                      setTemplate(tpl.value)
                      if (tpl.value !== 'custom') setMessageBody(tpl.body)
                      else setMessageBody('')
                    }}
                  />
                  {tpl.label}
                </label>
              ))}
            </div>
            <textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              rows={3}
              placeholder="Write your message…"
              className="w-full rounded-xl border border-slate-200 bg-card px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            <label className="flex min-h-8 items-center gap-2 text-xs text-ink-soft">
              <input
                type="checkbox"
                checked={includeLevel}
                onChange={(e) => setIncludeLevel(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              Include current readiness level (as a word)
            </label>
            {message.error && (
              <p className="text-xs text-band-red">{friendlyError(message.error)}</p>
            )}
            <div className="flex justify-end">
              <Button
                size="sm"
                type="submit"
                loading={message.isPending}
                disabled={!messageBody.trim()}
              >
                <Icon name="message" className="h-4 w-4" />
                Send to parent
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
