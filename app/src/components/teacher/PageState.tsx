/**
 * Shared loading / error states for teacher pages — same conventions as
 * the student pages (Spinner while loading, EmptyState + friendlyError +
 * retry on failure).
 */
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { Spinner } from '../ui/Spinner'
import { friendlyError } from '../../lib/api/errors'
import type { IconName } from '../icons'

export function LoadingState() {
  return (
    <div className="flex justify-center py-20">
      <Spinner className="h-8 w-8 text-primary" />
    </div>
  )
}

export function ErrorState({
  title,
  error,
  onRetry,
  icon = 'alert',
}: {
  title: string
  error: unknown
  onRetry: () => void
  icon?: IconName
}) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={friendlyError(error)}
      action={
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  )
}
