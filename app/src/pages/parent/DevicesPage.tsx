/**
 * /parent/devices — manage the 2-device cap (MAX_PARENT_DEVICES,
 * backend/app/models/parent.py:9). GET /parent/devices, DELETE
 * /parent/devices/{id}. The 5-minute heartbeat lives in ParentRoot.
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/icons'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { ConfirmDialog } from '../../components/principal/ConfirmDialog'
import { parentKeys } from '../../components/parent/hooks'
import { formatDateTime } from '../../components/parent/format'
import { getDevices, removeDevice, type ParentDevice } from '../../lib/api/parent'
import { friendlyError } from '../../lib/api/errors'

export function DevicesPage() {
  const qc = useQueryClient()
  const devices = useQuery({ queryKey: parentKeys.devices, queryFn: getDevices })
  const [toRemove, setToRemove] = useState<ParentDevice | null>(null)

  const remove = useMutation({
    mutationFn: (deviceId: string) => removeDevice(deviceId),
    onSuccess: () => {
      setToRemove(null)
      void qc.invalidateQueries({ queryKey: parentKeys.devices })
    },
  })

  if (devices.isLoading) return <LoadingState />
  if (!devices.data) {
    return (
      <ErrorState
        title="We couldn't load your devices"
        error={devices.error}
        onRetry={() => devices.refetch()}
        icon="device"
      />
    )
  }

  const d = devices.data

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Devices</h1>
        <p className="mt-1 text-sm text-ink-muted">
          You can stay signed in on up to {d.max_devices} devices —{' '}
          {d.current_count} in use right now.
        </p>
      </div>

      {d.devices.length === 0 ? (
        <Card>
          <EmptyState
            icon="device"
            title="No active devices"
            description="Devices appear here when you sign in on a phone or computer."
          />
        </Card>
      ) : (
        <Card padded={false} className="divide-y divide-slate-100">
          {d.devices.map((device) => (
            <div key={device.id} className="flex items-center gap-4 px-6 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary">
                <Icon name="device" className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                  <span className="truncate">{device.device_name}</span>
                  {device.is_stale && <Badge tone="neutral">Inactive</Badge>}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Signed in {formatDateTime(device.login_at)} · last active{' '}
                  {formatDateTime(device.last_active_at)}
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setToRemove(device)}
                aria-label={`Sign out ${device.device_name}`}
              >
                Sign out
              </Button>
            </div>
          ))}
        </Card>
      )}

      {remove.isError && (
        <p className="text-sm text-band-red">{friendlyError(remove.error)}</p>
      )}

      <p className="text-xs leading-relaxed text-ink-muted">
        Signing out a device frees a slot if you've hit the {d.max_devices}-device
        limit. The device will need to sign in again to reconnect.
      </p>

      <ConfirmDialog
        open={toRemove !== null}
        title="Sign out this device?"
        description={
          toRemove
            ? `${toRemove.device_name} will be signed out and will need your password to reconnect.`
            : undefined
        }
        confirmLabel="Sign out device"
        danger
        loading={remove.isPending}
        onConfirm={() => toRemove && remove.mutate(toRemove.id)}
        onCancel={() => setToRemove(null)}
      />
    </div>
  )
}
