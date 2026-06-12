import { SidebarLayout } from './SidebarLayout'
import { PRINCIPAL_NAV } from '../nav'

export function PrincipalLayout() {
  return <SidebarLayout roleLabel="School Leader" items={PRINCIPAL_NAV} />
}
