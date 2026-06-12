import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Icon } from '../../components/icons'
import { Logo } from '../../components/Logo'
import { NotificationBell } from '../../components/NotificationBell'
import { UserMenu } from '../../components/UserMenu'
import { useAuth } from '../../lib/auth/AuthContext'
import type { NavItem } from '../nav'

export interface SidebarLayoutProps {
  /** Shown under the wordmark, e.g. "Teacher". */
  roleLabel: string
  items: NavItem[]
}

function SidebarNav({
  items,
  collapsed,
  onNavigate,
}: {
  items: NavItem[]
  collapsed: boolean
  onNavigate?: () => void
}) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Primary">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          title={collapsed ? item.label : undefined}
          className={({ isActive }) =>
            [
              'flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              collapsed ? 'justify-center' : '',
              isActive
                ? 'bg-white/10 text-white'
                : 'text-slate-300 hover:bg-white/5 hover:text-white',
            ].join(' ')
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                name={item.icon}
                className={`h-5 w-5 shrink-0 ${isActive ? 'text-accent-light' : ''}`}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

/**
 * Desktop web shell for teacher / parent / principal: collapsible navy
 * sidebar + top bar; drawer on <768px. A proper web app layout — not a
 * stretched mobile screen.
 */
export function SidebarLayout({ roleLabel, items }: SidebarLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="min-h-dvh bg-surface md:flex">
      {/* Desktop sidebar */}
      <aside
        className={[
          'hidden md:flex md:flex-col bg-navy text-white',
          'sticky top-0 h-dvh shrink-0 transition-[width] duration-200',
          collapsed ? 'w-20' : 'w-64',
        ].join(' ')}
      >
        <div className={`flex h-16 items-center ${collapsed ? 'justify-center' : 'px-5'}`}>
          <Logo variant="light" withWordmark={!collapsed} />
        </div>
        {!collapsed && (
          <p className="px-5 pb-2 text-[11px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
            {roleLabel}
          </p>
        )}
        <SidebarNav items={items} collapsed={collapsed} />
        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Icon
              name="chevron-left"
              className={`h-5 w-5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
            />
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-navy/50"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-navy text-white shadow-soft">
            <div className="flex h-16 items-center justify-between px-5">
              <Logo variant="light" />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="flex h-12 w-12 items-center justify-center rounded-full text-slate-300 hover:text-white"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>
            <p className="px-5 pb-2 text-[11px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
              {roleLabel}
            </p>
            <SidebarNav
              items={items}
              collapsed={false}
              onNavigate={() => setDrawerOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 bg-card shadow-soft">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
                className="flex h-12 w-12 items-center justify-center rounded-full text-ink-soft hover:bg-slate-50 md:hidden"
              >
                <Icon name="menu" className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {user?.full_name ?? roleLabel}
                </p>
                <p className="text-xs text-ink-muted">{roleLabel} workspace</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <NotificationBell />
              <UserMenu />
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
