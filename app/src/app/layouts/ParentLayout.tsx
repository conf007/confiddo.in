import { SidebarLayout } from './SidebarLayout'
import { PARENT_NAV } from '../nav'

export function ParentLayout() {
  return <SidebarLayout roleLabel="Parent" items={PARENT_NAV} />
}
