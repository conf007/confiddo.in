import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/icons'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { ReadinessChip } from '../../components/teacher/ReadinessChip'
import { teacherKeys } from '../../components/teacher/hooks'
import {
  getAllClassesHistory,
  getClassReviewHistory,
  type HistoricalReview,
  type ReviewDecision,
} from '../../lib/api/teacher'
import { READINESS_CODE_TO_LEVEL, readinessDisplayName } from '../../lib/parity'
import type { ReadinessCode } from '../../lib/parity'

const ACTION_LABEL: Record<string, string> = {
  agree: 'Agreed',
  same: 'Kept same',
  adjust: 'Adjusted',
}

function levelRank(code: string): number {
  return READINESS_CODE_TO_LEVEL[code as ReadinessCode] ?? 99
}

function weekLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `Week of ${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

function Decisions({ decisions }: { decisions: ReviewDecision[] }) {
  if (decisions.length === 0) {
    return <p className="text-sm text-ink-muted">No decisions recorded.</p>
  }
  const groups = new Map<string, ReviewDecision[]>()
  for (const d of decisions) {
    const level = d.final_level || d.current_level
    groups.set(level, [...(groups.get(level) ?? []), d])
  }
  const ordered = Array.from(groups.entries()).sort((a, b) => levelRank(a[0]) - levelRank(b[0]))
  return (
    <div className="space-y-3">
      {ordered.map(([level, items]) => (
        <div key={level} className="border-l-2 border-primary/30 pl-3">
          <p className="flex items-center gap-2 text-xs font-semibold text-ink">
            {readinessDisplayName(level)}
            <Badge tone="neutral">{items.length}</Badge>
          </p>
          <ul className="mt-1.5 space-y-1">
            {items.map((d, i) => (
              <li key={i} className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
                <span className="font-medium text-ink">{d.student_first_name}</span>
                <ReadinessChip level={d.current_level} />
                <span aria-hidden>→</span>
                <ReadinessChip level={d.final_level || d.current_level} />
                <Badge tone="outline">{ACTION_LABEL[d.action] ?? d.action}</Badge>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function ReviewCard({ review, showClass = false }: { review: HistoricalReview; showClass?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <Card padded={false} data-testid="review-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-3 px-6 py-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{review.test_title}</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {showClass && review.class_name && `${review.class_name} • `}
            {weekLabel(review.week_start_date)}
            {review.total_time_display && ` • ${review.total_time_display}`}
          </p>
        </div>
        <dl className="flex gap-4 text-center text-xs">
          <div>
            <dt className="text-ink-muted">Reviewed</dt>
            <dd className="font-semibold text-ink">{review.students_reviewed}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Up</dt>
            <dd className="font-semibold text-success">{review.moved_up}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Same</dt>
            <dd className="font-semibold text-ink-soft">{review.stayed}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Down</dt>
            <dd className="font-semibold text-band-red">{review.moved_down}</dd>
          </div>
        </dl>
        <Icon
          name="chevron-down"
          className={`h-4 w-4 shrink-0 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t border-slate-100 px-6 py-4">
          <Decisions decisions={review.decisions} />
        </div>
      )}
    </Card>
  )
}

export function ClassHistoryPage() {
  const { classId = '' } = useParams()
  const history = useQuery({
    queryKey: teacherKeys.reviewHistory(classId),
    queryFn: () => getClassReviewHistory(classId),
    enabled: !!classId,
  })
  if (history.isLoading) return <LoadingState />
  if (!history.data) {
    return (
      <ErrorState
        title="We couldn't load past reviews"
        error={history.error}
        onRetry={() => history.refetch()}
        icon="check"
      />
    )
  }
  const h = history.data
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          to={`/teacher/classes/${classId}`}
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink"
        >
          <Icon name="arrow-left" className="h-3.5 w-3.5" />
          Class overview
        </Link>
        <h1 className="text-2xl font-bold text-ink">Past reviews</h1>
        <p className="mt-1 text-sm text-ink-muted">{h.class_name}</p>
      </div>
      {h.reviews.length === 0 ? (
        <EmptyState
          icon="check"
          title="No past reviews yet"
          description="Completed reviews for this class will appear here."
        />
      ) : (
        <div className="space-y-3">
          {h.reviews.map((r) => (
            <ReviewCard key={r.session_id} review={r} />
          ))}
        </div>
      )}
    </div>
  )
}

export function AllHistoryPage() {
  const [classFilter, setClassFilter] = useState<string | null>(null)
  const history = useQuery({ queryKey: teacherKeys.allHistory, queryFn: getAllClassesHistory })
  if (history.isLoading) return <LoadingState />
  if (!history.data) {
    return (
      <ErrorState
        title="We couldn't load your history"
        error={history.error}
        onRetry={() => history.refetch()}
        icon="check"
      />
    )
  }
  const h = history.data
  const shown = classFilter ? h.reviews.filter((r) => r.class_id === classFilter) : h.reviews
  const chip = (label: string, active: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'inline-flex h-10 items-center rounded-full border px-4 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary-tint text-primary'
          : 'border-slate-200 bg-card text-ink-soft hover:border-slate-300',
      ].join(' ')}
    >
      {label}
    </button>
  )
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">History</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {h.total_count} past review{h.total_count === 1 ? '' : 's'} across {h.classes.length}{' '}
          class{h.classes.length === 1 ? '' : 'es'}
        </p>
      </div>
      {h.classes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chip(`All (${h.total_count})`, classFilter === null, () => setClassFilter(null))}
          {h.classes.map((c) => {
            const count = h.reviews.filter((r) => r.class_id === c.class_id).length
            return (
              <span key={c.class_id}>
                {chip(`${c.class_name} (${count})`, classFilter === c.class_id, () =>
                  setClassFilter(c.class_id),
                )}
              </span>
            )
          })}
        </div>
      )}
      {shown.length === 0 ? (
        <EmptyState
          icon="check"
          title="No past reviews yet"
          description="Completed reviews will appear here."
        />
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <ReviewCard key={`${r.class_id}-${r.session_id}`} review={r} showClass />
          ))}
        </div>
      )}
    </div>
  )
}
