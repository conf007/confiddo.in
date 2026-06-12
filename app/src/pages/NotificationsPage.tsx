/**
 * Shared notification center for all roles (in-app history; mark read /
 * mark all read; offset paging via "Load more").
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState, LoadingState } from '../components/teacher/PageState'
import { formatDateTime } from '../components/parent/format'
import { useAuth } from '../lib/auth/AuthContext'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationKeys,
  type AppNotification,
} from '../lib/api/notifications'

const PAGE_SIZE = 20

export function NotificationsPage() {
  const { role } = useAuth()
  const qc = useQueryClient()
  const [limit, setLimit] = useState(PAGE_SIZE)

  const q = useQuery({
    queryKey: [...notificationKeys.list(role!), limit],
    queryFn: () => getNotifications(role!, { limit }),
    enabled: role !== null,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: notificationKeys.list(role!) })
    qc.invalidateQueries({ queryKey: notificationKeys.unread(role!) })
  }
  const markOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(role!, id),
    onSuccess: invalidate,
  })
  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(role!),
    onSuccess: invalidate,
  })

  if (!role) return null
  if (q.isPending) return <LoadingState />
  if (q.isError)
    return (
      <ErrorState title="Couldn't load notifications" error={q.error} onRetry={() => q.refetch()} />
    )
  const d = q.data

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Notifications</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {d.unread_count > 0 ? `${d.unread_count} unread` : 'All caught up'}
          </p>
        </div>
        {d.unread_count > 0 && (
          <Button
            size="sm"
            variant="secondary"
            loading={markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Mark all read
          </Button>
        )}
      </header>

      {d.notifications.length === 0 ? (
        <EmptyState
          icon="bell"
          title="Nothing here yet"
          description="Updates about tests, reviews and summaries will appear here."
        />
      ) : (
        <ul className="space-y-3">
          {d.notifications.map((n) => (
            <NotificationRow
              key={n.id}
              n={n}
              onRead={() => !n.is_read && markOne.mutate(n.id)}
            />
          ))}
        </ul>
      )}

      {d.has_more && (
        <div className="text-center">
          <Button variant="ghost" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  )
}

function NotificationRow({ n, onRead }: { n: AppNotification; onRead: () => void }) {
  return (
    <li>
      <button type="button" onClick={onRead} className="block w-full text-left">
        <Card
          className={[
            'p-4 transition-shadow hover:shadow-md',
            n.is_read ? 'opacity-75' : 'border-l-4 border-primary',
          ].join(' ')}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">{n.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{n.body}</p>
              <p className="mt-1.5 text-xs text-ink-muted">{formatDateTime(n.created_at)}</p>
            </div>
            {!n.is_read && <Badge tone="primary">New</Badge>}
          </div>
        </Card>
      </button>
    </li>
  )
}
