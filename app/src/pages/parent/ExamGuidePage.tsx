/**
 * /parent/exam-guide — exam season guide articles (P10).
 * GET /parent/exam-guide?category= (parent_service.py:2320-2350).
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { parentKeys } from '../../components/parent/hooks'
import { getExamGuide } from '../../lib/api/parent'

export function ExamGuidePage() {
  const [category, setCategory] = useState<string | undefined>(undefined)
  const guide = useQuery({
    queryKey: parentKeys.examGuide(category),
    queryFn: () => getExamGuide(category),
  })

  if (guide.isLoading) return <LoadingState />
  if (!guide.data) {
    return (
      <ErrorState
        title="We couldn't load the exam guide"
        error={guide.error}
        onRetry={() => guide.refetch()}
        icon="book"
      />
    )
  }

  const g = guide.data

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Exam season guide</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Calm, practical ways to support your child — pressure-free.
        </p>
      </div>

      {g.categories.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Categories">
          <CategoryChip
            label="All"
            active={!category}
            onClick={() => setCategory(undefined)}
          />
          {g.categories.map((c) => (
            <CategoryChip
              key={c}
              label={c}
              active={category === c}
              onClick={() => setCategory(c)}
            />
          ))}
        </div>
      )}

      {g.featured_tip && !category && (
        <div className="rounded-card bg-primary-tint p-6">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            Featured tip
          </p>
          <h2 className="mt-2 text-base font-semibold text-ink">{g.featured_tip.title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            {g.featured_tip.body}
          </p>
        </div>
      )}

      {g.articles.length === 0 ? (
        <Card>
          <EmptyState
            icon="book"
            title="No articles here yet"
            description="Guide content is on its way — check back soon."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {g.articles.map((a) => (
            <Card key={a.id}>
              <p className="text-xs font-medium text-ink-muted">{a.category}</p>
              <h2 className="mt-1 text-base font-semibold text-ink">{a.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-ink-soft">
                {a.body}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'h-10 rounded-full px-4 text-sm font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        active
          ? 'bg-primary text-white'
          : 'bg-card text-ink-soft shadow-soft hover:bg-slate-50',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
