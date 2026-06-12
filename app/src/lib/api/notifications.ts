/**
 * In-app notification center, phase 1 of the web notifications plan
 * (ARCHITECTURE.md §7): poll the per-role history + unread-count
 * endpoints; FCM web push is a later phase (needs a Firebase web config).
 *
 * Backend: backend/app/api/notifications.py — the router is mounted at the
 * API root (api/__init__.py:16), so paths are /v1/{role}/notifications[...].
 */
import { apiData } from './envelope'
import type { Role } from '../auth/tokens'

export interface AppNotification {
  id: string
  notification_type: string
  title: string
  body: string
  reference_type: string | null
  reference_id: string | null
  is_read: boolean
  read_at: string | null
  extra_data: Record<string, unknown>
  created_at: string
}

export interface NotificationList {
  notifications: AppNotification[]
  unread_count: number
  total: number
  has_more: boolean
}

export function getNotifications(
  role: Role,
  opts: { limit?: number; offset?: number; unreadOnly?: boolean } = {},
): Promise<NotificationList> {
  return apiData(`/${role}/notifications`, {
    query: {
      limit: opts.limit ?? 20,
      offset: opts.offset ?? 0,
      unread_only: opts.unreadOnly || undefined,
    },
  })
}

export function getUnreadCount(role: Role): Promise<{ unread_count: number }> {
  return apiData(`/${role}/notifications/unread-count`)
}

export function markNotificationRead(
  role: Role,
  notificationId: string,
): Promise<{ message?: string }> {
  return apiData(`/${role}/notifications/${notificationId}/mark-read`, {
    method: 'POST',
  })
}

export function markAllNotificationsRead(role: Role): Promise<{ message?: string }> {
  return apiData(`/${role}/notifications/mark-all-read`, { method: 'POST' })
}

export const notificationKeys = {
  list: (role: Role) => ['notifications', role, 'list'] as const,
  unread: (role: Role) => ['notifications', role, 'unread'] as const,
}
