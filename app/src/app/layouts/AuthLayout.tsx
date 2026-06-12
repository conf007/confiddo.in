import { Outlet } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { Icon } from '../../components/icons'

const VALUE_PROPS = [
  { icon: 'check' as const, text: 'Readiness over marks — confidence words, not scores' },
  { icon: 'flame' as const, text: 'XP, streaks and characters that reward honest effort' },
  { icon: 'users' as const, text: 'Built for students, teachers, parents and school leaders' },
]

/**
 * Public auth shell: dark navy brand panel (desktop) + light form column,
 * matching the confiddo.in landing feel.
 */
export function AuthLayout() {
  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[5fr_7fr]">
      {/* Navy brand panel — desktop only */}
      <aside className="hidden lg:flex flex-col justify-between bg-navy px-[8%] py-12 text-white">
        <Logo variant="light" />
        <div>
          <h1 className="text-3xl xl:text-4xl font-bold leading-tight">
            Confidence Builds
            <br />
            Readiness
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
            Practice without pressure. Confiddo turns honest effort into
            visible growth — for the whole school community.
          </p>
          <ul className="mt-10 space-y-4">
            {VALUE_PROPS.map((v) => (
              <li key={v.text} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-accent-light">
                  <Icon name={v.icon} className="h-4 w-4" />
                </span>
                <span className="text-sm leading-relaxed text-slate-200">
                  {v.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} Confiddo · confiddo.in
        </p>
      </aside>

      {/* Form column */}
      <div className="flex min-h-dvh flex-col lg:min-h-0">
        {/* Compact navy header on mobile/tablet */}
        <header className="flex items-center justify-between bg-navy px-5 py-4 lg:hidden">
          <Logo variant="light" />
          <span className="text-[11px] font-medium tracking-[0.18em] text-slate-300 uppercase">
            Confidence Builds Readiness
          </span>
        </header>
        <main className="flex flex-1 items-start justify-center px-4 py-8 sm:px-8 sm:py-12">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
