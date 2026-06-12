/**
 * Header bell with unread badge — polls unread-count every 60 s
 * (notifications phase 1, ARCHITECTURE.md §7) and links to the role's
 * notification center.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Icon } from './icons'
import { useAuth } from '../lib/auth/AuthContext'
import { getUnreadCount, notificationKeys } from '../lib/api/notifications'

export function NotificationBell() {
  const { role } = useAuth()
  const q = useQuery({
    queryKey: role ? notificationKeys.unread(role) : ['notifications', 'none'],
    queryFn: () => getUnreadCount(role!),
    enabled: role !== null && role !== 'admin',
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
  if (!role || role === 'admin') return null
  const unread = q.data?.unread_count ?? 0

  return (
    <Link
      to={`/${role}/notifications`}
      aria-label={unread > 0 ? `Notifications — ${unread} unread` : 'Notifications'}
      className="relative flex h-12 w-12 items-center justify-center rounded-full text-ink-muted hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Icon name="bell" className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute top-2 right-2 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  )
}
