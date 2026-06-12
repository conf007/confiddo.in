import { NavLink, Outlet } from 'react-router-dom'
import { Icon } from '../../components/icons'
import { Logo } from '../../components/Logo'
import { NotificationBell } from '../../components/NotificationBell'
import { UserMenu } from '../../components/UserMenu'
import { XpChip } from '../../components/student/XpChip'
import { STUDENT_TABS } from '../nav'

/**
 * Student shell: top header (logo, XP chip, bell, profile) + horizontal tab
 * nav on ≥768px; bottom tab bar on mobile.
 */
export function StudentLayout() {
  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-30 bg-card shadow-soft">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Logo className="shrink-0" />

          {/* Desktop tabs */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
            {STUDENT_TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  [
                    'flex h-12 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                    isActive
                      ? 'bg-primary-tint text-primary'
                      : 'text-ink-muted hover:bg-slate-50 hover:text-ink-soft',
                  ].join(' ')
                }
              >
                <Icon name={tab.icon} className="h-4.5 w-4.5" />
                {tab.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <XpChip />
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 md:pb-10">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-100 bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Primary"
      >
        <div className="grid grid-cols-5">
          {STUDENT_TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                [
                  'flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium',
                  isActive ? 'text-primary' : 'text-ink-muted',
                ].join(' ')
              }
            >
              <Icon name={tab.icon} className="h-5 w-5" />
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
