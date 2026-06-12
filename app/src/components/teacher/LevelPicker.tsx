/**
 * Readiness level picker (L1-L5) for the "Adjust" validation action.
 * Display names come from the parity lib (suggestion_model.dart port) —
 * avoidant shows as "Needs Encouragement".
 */
import {
  READINESS_DISPLAY_NAMES,
  READINESS_LEVEL_TO_CODE,
} from '../../lib/parity'
import type { ReadinessCode, ReadinessLevel } from '../../lib/parity'

const LEVELS: ReadinessLevel[] = [1, 2, 3, 4, 5]

export function LevelPicker({
  value,
  onChange,
  name,
}: {
  value: ReadinessCode | null
  onChange: (code: ReadinessCode) => void
  /** Unique radio-group name per student row. */
  name: string
}) {
  return (
    <fieldset className="flex flex-wrap gap-2" aria-label="Pick a readiness level">
      {LEVELS.map((lvl) => {
        const code = READINESS_LEVEL_TO_CODE[lvl]
        const selected = value === code
        return (
          <label
            key={code}
            className={[
              'inline-flex h-12 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors select-none',
              selected
                ? 'border-primary bg-primary-tint text-primary'
                : 'border-slate-200 bg-card text-ink-soft hover:border-slate-300',
            ].join(' ')}
          >
            <input
              type="radio"
              name={name}
              value={code}
              checked={selected}
              onChange={() => onChange(code)}
              className="sr-only"
            />
            <span className="font-semibold">L{lvl}</span>
            {READINESS_DISPLAY_NAMES[code]}
          </label>
        )
      })}
    </fieldset>
  )
}
