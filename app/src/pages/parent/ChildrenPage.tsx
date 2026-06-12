/**
 * /parent — children selection home (Flutter parity: P1
 * ChildSelectionScreen). GET /parent/children; cards with a "new summary"
 * dot; empty state leads to link-child. Warm, narrative-first copy —
 * effort stories, never scores (ARCHITECTURE.md §6.3).
 */
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/icons'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { useChildrenQuery } from '../../components/parent/hooks'

export function ChildrenPage() {
  const children = useChildrenQuery()

  if (children.isLoading) return <LoadingState />
  if (!children.data) {
    return (
      <ErrorState
        title="We couldn't load your children"
        error={children.error}
        onRetry={() => children.refetch()}
        icon="users"
      />
    )
  }

  const kids = children.data.children

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">My children</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Weekly effort stories about how each child is growing in confidence.
        </p>
      </div>

      {kids.length === 0 ? (
        <Card>
          <EmptyState
            icon="link"
            title="No children linked yet"
            description="Ask your child to generate a 6-character code in their app, then link them here — it takes under a minute."
            action={
              <Link to="/parent/link-child">
                <Button>Link a child</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {kids.map((child) => (
              <Link
                key={child.id}
                to={`/parent/children/${child.id}`}
                className="group rounded-card bg-card p-6 shadow-soft transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-tint text-lg font-bold text-primary">
                    {child.first_name.charAt(0).toUpperCase()}
                  </span>
                  {child.has_new_summary && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-tint px-2.5 py-0.5 text-xs font-medium text-accent">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                      New summary
                    </span>
                  )}
                </div>
                <p className="mt-4 text-lg font-semibold text-ink group-hover:text-primary">
                  {child.first_name}
                </p>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {child.grade ? `Class ${child.grade}` : 'Class —'}
                  {child.school_name ? ` · ${child.school_name}` : ''}
                </p>
                <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  See their week
                  <Icon name="chevron-down" className="h-4 w-4 -rotate-90" />
                </p>
              </Link>
            ))}
          </div>

          <Card className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">Have another child to add?</p>
              <p className="text-xs text-ink-muted">
                Use the 6-character code from their app.
              </p>
            </div>
            <Link to="/parent/link-child">
              <Button variant="secondary" size="sm">
                <Icon name="link" className="h-4 w-4" />
                Link a child
              </Button>
            </Link>
          </Card>
        </>
      )}
    </div>
  )
}
