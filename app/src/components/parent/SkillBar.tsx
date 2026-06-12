/**
 * Effort-quality bar for parent views (soft skills, engagement). The
 * backend sends behavior-derived 0-100 values; per the parent privacy
 * stance (ARCHITECTURE.md §6.3 + effort-not-marks) we render a qualitative
 * WORD + a soft bar, never a numeric score or percentage.
 */
const QUALITY_WORDS: [number, string][] = [
  [70, 'Strong'],
  [40, 'Growing'],
  [0, 'Developing'],
]

function skillWord(value: number): string {
  for (const [min, word] of QUALITY_WORDS) {
    if (value >= min) return word
  }
  return 'Developing'
}

export function SkillBar({ label, value }: { label: string; value: number }) {
  const clamped = Math.max(0, Math.min(100, value))
  const word = skillWord(clamped)
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="text-xs font-medium text-ink-muted">{word}</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={`${label}: ${word}`}
      >
        <div
          className="h-full rounded-full bg-primary/70"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
