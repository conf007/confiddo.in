import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Icon } from '../icons'
import { Sheet } from './Sheet'
import { surfaceLabel, type SessionLock } from '../../lib/api/sessions'

export interface SessionLockGateProps {
  lock: SessionLock | null
  onTakeOver: () => void
  taking: boolean
  error?: string | null
}

export function SessionLockGate({ lock, onTakeOver, taking, error }: SessionLockGateProps) {
  if (!lock) return null

  if (lock.taken_over) {
    return (
      <Sheet open onClose={() => undefined} dismissible={false} title="">
        <div className="flex flex-col items-center pb-2 text-center" data-testid="session-taken-over">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Icon name="lock" className="h-7 w-7" />
          </span>
          <h2 className="text-xl font-bold text-ink">This test was continued on another device.</h2>
          <div className="mt-6 w-full">
            <Link to="/student" className="block">
              <Button full variant="secondary">
                Back to home
              </Button>
            </Link>
          </div>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet open onClose={() => undefined} dismissible={false} title="">
      <div className="flex flex-col items-center pb-2 text-center" data-testid="session-locked">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-tint text-primary">
          <Icon name="device" className="h-7 w-7" />
        </span>
        <h2 className="text-xl font-bold text-ink">
          This test is open on {surfaceLabel(lock.surface_kind)}.
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Continue here instead? The other device will be locked.
        </p>
        {error && (
          <p className="mt-4 text-sm text-band-red" role="alert">
            {error}
          </p>
        )}
        <div className="mt-6 flex w-full flex-col gap-3">
          <Button full onClick={onTakeOver} loading={taking}>
            Continue here
          </Button>
          <Link to="/student" className="block">
            <Button full variant="ghost">
              Not now
            </Button>
          </Link>
        </div>
      </div>
    </Sheet>
  )
}
