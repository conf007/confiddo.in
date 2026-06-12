/**
 * /teacher/settings — notification preferences (Flutter parity:
 * notification_settings_screen.dart).
 *
 * Endpoints:
 *   GET /teacher/notifications/preferences  (teacher.py:541-549)
 *   PUT /teacher/notifications/preferences  (teacher.py:552-561)
 *
 * NOTE on quiet hours: the TEACHER preference model is per-type toggles +
 * a weekly reminder day/time HH:MM (teacher_service.py:2001-2016). Quiet
 * hours exist only for student/parent/principal roles in
 * backend/app/api/notifications.py — there is no teacher quiet-hours
 * endpoint, so the web mirrors exactly what the teacher role supports.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Icon } from '../../components/icons'
import { Switch } from '../../components/teacher/Switch'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { teacherKeys } from '../../components/teacher/hooks'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type TeacherNotificationPreferences,
} from '../../lib/api/teacher'
import { friendlyError } from '../../lib/api/errors'

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

export function NotificationSettingsPage() {
  const queryClient = useQueryClient()
  const prefs = useQuery({
    queryKey: teacherKeys.notificationPrefs,
    queryFn: getNotificationPreferences,
  })

  // Local unsaved edits layered over the server state — no effect needed.
  const [overrides, setOverrides] = useState<Partial<TeacherNotificationPreferences>>({})
  const form: TeacherNotificationPreferences | null = prefs.data
    ? { ...prefs.data, ...overrides }
    : null

  const save = useMutation({
    mutationFn: (next: TeacherNotificationPreferences) =>
      updateNotificationPreferences(next),
    onSuccess: (data) => {
      queryClient.setQueryData(teacherKeys.notificationPrefs, data)
      setOverrides({})
    },
  })

  if (prefs.isLoading || !form) {
    if (prefs.isError) {
      return (
        <ErrorState
          title="We couldn't load your settings"
          error={prefs.error}
          onRetry={() => prefs.refetch()}
          icon="settings"
        />
      )
    }
    return <LoadingState />
  }

  const set = <K extends keyof TeacherNotificationPreferences>(
    key: K,
    value: TeacherNotificationPreferences[K],
  ) => setOverrides((prev) => ({ ...prev, [key]: value }))

  const dirty = JSON.stringify(form) !== JSON.stringify(prefs.data)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Notification settings</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Choose what Confiddo nudges you about, and when.
        </p>
      </div>

      <Card className="divide-y divide-slate-100">
        <div className="pb-4">
          <Switch
            checked={form.weekly_reminder_enabled}
            onChange={(v) => set('weekly_reminder_enabled', v)}
            label="Weekly review reminder"
            description="A nudge to validate readiness suggestions each week"
          />
          {form.weekly_reminder_enabled && (
            <div className="mt-2 flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <span className="text-xs font-medium">Day</span>
                <select
                  value={form.reminder_day}
                  onChange={(e) => set('reminder_day', e.target.value)}
                  className="h-12 rounded-xl border border-slate-200 bg-card px-3 text-sm text-ink capitalize outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d} className="capitalize">
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <span className="text-xs font-medium">Time</span>
                <input
                  type="time"
                  value={form.reminder_time}
                  onChange={(e) => set('reminder_time', e.target.value)}
                  className="h-12 rounded-xl border border-slate-200 bg-card px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </label>
            </div>
          )}
        </div>
        <div className="py-1">
          <Switch
            checked={form.notify_level_changes}
            onChange={(v) => set('notify_level_changes', v)}
            label="Readiness level changes"
            description="When a student's weekly level moves up or down"
          />
        </div>
        <div className="py-1">
          <Switch
            checked={form.notify_flag_updates}
            onChange={(v) => set('notify_flag_updates', v)}
            label="Flag updates"
            description="Follow-ups on students you've flagged"
          />
        </div>
        <div className="pt-1">
          <Switch
            checked={form.notify_principal_messages}
            onChange={(v) => set('notify_principal_messages', v)}
            label="Messages from your principal"
            description="School announcements and direct notes"
          />
        </div>
      </Card>

      {save.error && (
        <p className="text-sm text-band-red">{friendlyError(save.error)}</p>
      )}
      <div className="flex items-center justify-end gap-3">
        {save.isSuccess && !dirty && (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <Icon name="check" className="h-4 w-4" />
            Saved
          </span>
        )}
        <Button
          onClick={() => save.mutate(form)}
          loading={save.isPending}
          disabled={!dirty}
        >
          Save changes
        </Button>
      </div>
    </div>
  )
}
