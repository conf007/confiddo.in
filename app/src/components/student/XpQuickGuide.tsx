import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Sheet } from './Sheet'
import {
  XP_CORRECT_NO_HINT,
  XP_CORRECT_WITH_HINT,
  XP_WRONG_GAVE_UP,
  XP_TEST_COMPLETED,
  XP_SKIP_PENALTY,
} from '../../lib/parity'

const ROWS: [string, number][] = [
  ['Genuine attempt', XP_CORRECT_NO_HINT],
  ['With hint', XP_CORRECT_WITH_HINT],
  ['After viewing solution', XP_WRONG_GAVE_UP],
  ['Complete test', XP_TEST_COMPLETED],
  ['Skip (unreviewed)', XP_SKIP_PENALTY],
  ['Leaving the test', -2],
]

export function XpQuickGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="⚡ XP Quick Guide">
      <ul className="divide-y divide-slate-100" data-testid="xp-quick-guide">
        {ROWS.map(([label, pts]) => (
          <li key={label} className="flex items-center justify-between py-2.5 text-sm">
            <span className="text-ink">{label}</span>
            <span className={`font-semibold ${pts > 0 ? 'text-success' : pts === 0 ? 'text-accent' : 'text-band-red'}`}>
              {pts > 0 ? `+${pts}` : pts} XP
            </span>
          </li>
        ))}
      </ul>
      <Link to="/student/xp-rules" className="mt-4 block">
        <Button full variant="secondary">
          See all XP rules
        </Button>
      </Link>
    </Sheet>
  )
}
