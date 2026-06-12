/**
 * Pathless root for all /parent/* pages. Runs the 5-minute device
 * heartbeat (POST /parent/devices/heartbeat) while the parent workspace
 * is open — kept here, inside the parent pages tree, so the shared
 * SidebarLayout/ParentLayout stays role-agnostic.
 */
import { Outlet } from 'react-router-dom'
import { useDeviceHeartbeat } from '../../components/parent/hooks'

export function ParentRoot() {
  useDeviceHeartbeat()
  return <Outlet />
}
