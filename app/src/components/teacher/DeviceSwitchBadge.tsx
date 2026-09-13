import { Badge } from '../ui/Badge'
import { DEVICE_SWITCH_FLAG_THRESHOLD } from '../../lib/api/teacher'

export function DeviceSwitchBadge({ count }: { count?: number | null }) {
  if (!count || count < DEVICE_SWITCH_FLAG_THRESHOLD) return null
  return (
    <Badge tone="neutral" title={`${count} device switches during this test`}>
      Multiple device switches
    </Badge>
  )
}
