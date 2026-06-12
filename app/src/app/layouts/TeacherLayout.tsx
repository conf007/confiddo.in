import { SidebarLayout } from './SidebarLayout'
import { TEACHER_NAV } from '../nav'

export function TeacherLayout() {
  return <SidebarLayout roleLabel="Teacher" items={TEACHER_NAV} />
}
