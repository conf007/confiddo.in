import { Link } from 'react-router-dom'
import { Logo, LogoMark } from '../components/Logo'
import { Card } from '../components/ui/Card'
import { Icon } from '../components/icons'

const PILLARS = [
  { name: 'Readiness', text: 'Practice that shows how ready you are, in words, never marks.' },
  { name: 'Growth', text: 'Small steps every week, tracked as XP, streaks and characters.' },
  { name: 'Confidence', text: 'Hints to guide you, retries to build you, people cheering you on.' },
]

export function AboutPage() {
  return (
    <div className="min-h-dvh bg-surface">
      <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
        <Logo />
        <Link to="/" className="inline-flex h-12 items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink-soft">
          <Icon name="arrow-left" className="h-4 w-4" />
          Back
        </Link>
      </header>
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        <div className="text-center">
          <LogoMark className="mx-auto h-24 w-32" />
          <h1 className="mt-4 text-3xl font-extrabold tracking-[0.2em] text-ink">CONFIDDO</h1>
          <p className="mt-2 text-sm font-semibold tracking-[0.15em] text-ink-muted uppercase">Confidence builds readiness</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {PILLARS.map((p) => (
            <Card key={p.name} className="text-center">
              <p className="text-base font-semibold text-ink">{p.name}</p>
              <p className="mt-1 text-sm text-ink-muted">{p.text}</p>
            </Card>
          ))}
        </div>
        <Card>
          <h2 className="text-base font-semibold text-ink">Our Mission</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Confiddo helps students build academic readiness and confidence through personalized practice and
            meaningful feedback. We believe every student can succeed with the right support.
          </p>
        </Card>
        <p className="text-center text-xs text-ink-muted">Version 1.0.0 · © 2026 Confiddo · confiddo.in</p>
      </main>
    </div>
  )
}
