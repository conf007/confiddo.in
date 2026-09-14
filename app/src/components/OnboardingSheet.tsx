import { useState } from 'react'
import { Button } from './ui/Button'
import { Sheet } from './student/Sheet'

const KEY = 'confiddo.onboarding_complete'

const SLIDES = [
  { title: 'Built for You, Not for Your Marks', text: 'Practice that cares how you feel, not how you score.' },
  { title: 'Hints to guide you. Retries to build you.', text: 'Wrong answers are how learning happens.' },
  { title: 'Small Steps. Big Confidence.', text: 'Your streaks and stars tell your own story.' },
  { title: 'Never alone', text: 'Your teacher and parents are cheering you on.' },
]

function seen(): boolean {
  try {
    return window.localStorage.getItem(KEY) === 'true'
  } catch {
    return true
  }
}

export function OnboardingSheet() {
  const [open, setOpen] = useState(() => !seen())
  const [i, setI] = useState(0)
  if (!open) return null
  const last = i === SLIDES.length - 1
  const finish = () => {
    try {
      window.localStorage.setItem(KEY, 'true')
    } catch {
      /* storage unavailable */
    }
    setOpen(false)
  }
  return (
    <Sheet open onClose={finish} title="">
      <div className="flex flex-col items-center pb-2 text-center" data-testid="onboarding">
        <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
          {i + 1} of {SLIDES.length}
        </p>
        <h2 className="mt-2 text-xl font-bold text-ink">{SLIDES[i].title}</h2>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-muted">{SLIDES[i].text}</p>
        <div className="mt-4 flex gap-1.5" aria-hidden="true">
          {SLIDES.map((_, k) => (
            <span key={k} className={`h-1.5 w-6 rounded-full ${k === i ? 'bg-primary' : 'bg-slate-200'}`} />
          ))}
        </div>
        <div className="mt-6 flex w-full flex-col gap-3">
          <Button full onClick={() => (last ? finish() : setI(i + 1))}>
            {last ? "Let's go" : 'Next'}
          </Button>
          {!last && (
            <Button full variant="ghost" onClick={finish}>
              Skip
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  )
}
