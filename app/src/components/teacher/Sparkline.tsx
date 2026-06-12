/**
 * Self-history readiness sparkline (levels 1-5 over weeks) — a simple
 * inline SVG, one student's own trajectory only. No peer data ever appears
 * here (ARCHITECTURE.md §6.3).
 */
import { READINESS_CODE_TO_LEVEL, readinessDisplayName } from '../../lib/parity'
import type { ReadinessCode } from '../../lib/parity'

export interface SparkPoint {
  label: string
  level: string
}

function levelOf(code: string): number {
  return READINESS_CODE_TO_LEVEL[code as ReadinessCode] ?? 3
}

export function ReadinessSparkline({ points }: { points: SparkPoint[] }) {
  const w = 280
  const h = 72
  const padX = 10
  const padY = 10
  if (points.length === 0) return null

  const stepX = points.length > 1 ? (w - padX * 2) / (points.length - 1) : 0
  const yFor = (lvl: number) => h - padY - ((lvl - 1) / 4) * (h - padY * 2)
  const coords = points.map((p, i) => ({
    x: padX + i * stepX,
    y: yFor(levelOf(p.level)),
  }))
  const path = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ')

  const latest = points[points.length - 1]
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-20 w-full max-w-xs"
      role="img"
      aria-label={`Readiness trend over ${points.length} week${points.length === 1 ? '' : 's'}, currently ${readinessDisplayName(latest.level)}`}
    >
      {/* faint level gridlines */}
      {[1, 2, 3, 4, 5].map((lvl) => (
        <line
          key={lvl}
          x1={padX}
          x2={w - padX}
          y1={yFor(lvl)}
          y2={yFor(lvl)}
          className="stroke-slate-100"
          strokeWidth={1}
        />
      ))}
      {points.length > 1 && (
        <path
          d={path}
          fill="none"
          className="stroke-primary"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {coords.map((c, i) => (
        <circle
          key={i}
          cx={c.x}
          cy={c.y}
          r={i === coords.length - 1 ? 4 : 2.5}
          className={i === coords.length - 1 ? 'fill-accent' : 'fill-primary'}
        />
      ))}
    </svg>
  )
}
