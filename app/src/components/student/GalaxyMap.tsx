import { useMemo } from 'react'
import { galaxyMaxXp, seededRandom } from './galaxy'
import type { ClassRankingEntry } from '../../lib/api/student'

const W = 480
const H = 240
const CX = W / 2
const CY = H / 2
const MAX_R = Math.min(W, H) / 2 - 16
const INNER = 58
const ZONE_ANGLE = -2.45

function polar(r: number, angle: number) {
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) }
}

export function GalaxyMap({ entries }: { entries: ClassRankingEntry[] }) {
  const maxXp = galaxyMaxXp(entries)
  const stars = useMemo(() => {
    const rnd = seededRandom(99)
    return Array.from({ length: 90 }, () => ({
      x: rnd() * W,
      y: rnd() * H,
      r: rnd() * 1.6 + 0.3,
      o: rnd() * 0.65 + 0.2,
    }))
  }, [])
  const outer = MAX_R - 10
  const zones: [number, string][] = [[0.25, 'Inner'], [0.55, 'Mid'], [0.82, 'Rising']]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-xl" role="img" aria-label="Class galaxy map" data-testid="galaxy-map">
      <defs>
        <filter id="gx-blur-40"><feGaussianBlur stdDeviation="20" /></filter>
        <filter id="gx-blur-18"><feGaussianBlur stdDeviation="9" /></filter>
        <filter id="gx-blur-8"><feGaussianBlur stdDeviation="4" /></filter>
        <radialGradient id="gx-sun"><stop offset="0" stopColor="#FFE566" /><stop offset="1" stopColor="#FF8C00" /></radialGradient>
        <radialGradient id="gx-crown"><stop offset="0" stopColor="#FFEC6E" /><stop offset="1" stopColor="#FFAA00" /></radialGradient>
        <radialGradient id="gx-you"><stop offset="0" stopColor="#FFB347" /><stop offset="1" stopColor="#E05C00" /></radialGradient>
      </defs>
      <rect width={W} height={H} fill="#0B1220" />
      <circle cx={CX} cy={CY} r={MAX_R * 0.55} fill="#6B35CE" opacity="0.12" filter="url(#gx-blur-40)" />
      <circle cx={CX - MAX_R * 0.2} cy={CY + MAX_R * 0.1} r={MAX_R * 0.35} fill="#1A6BB5" opacity="0.10" filter="url(#gx-blur-40)" />
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />
      ))}
      {[1, 2, 3, 4].map((i) => (
        <circle key={i} cx={CX} cy={CY} r={(MAX_R * i) / 4} fill="none" stroke="#fff" strokeOpacity="0.07" strokeWidth="1" />
      ))}
      <circle cx={CX} cy={CY} r="38" fill="#FFB300" opacity="0.18" filter="url(#gx-blur-18)" />
      <circle cx={CX} cy={CY} r="24" fill="url(#gx-sun)" />
      <text x={CX} y={CY} fontSize="20" textAnchor="middle" dominantBaseline="central">🎯</text>
      {zones.map(([f, label]) => {
        const p = polar(MAX_R * f, ZONE_ANGLE)
        return (
          <text key={label} x={p.x} y={p.y} fontSize="8" fontWeight="600" fill="#fff" fillOpacity="0.6" textAnchor="middle" dominantBaseline="central">
            {label}
          </text>
        )
      })}
      {entries.map((e) => {
        const ratio = Math.min(1, Math.max(0, e.total_points / maxXp))
        const distance = outer - ratio * (outer - INNER)
        const angle = (e.rank / entries.length) * 2 * Math.PI + e.rank * 0.5
        const p = polar(distance, angle)
        const kind = e.rank === 1 ? 'crown' : e.is_current_user ? 'you' : 'mate'
        if (kind === 'mate') {
          const size = 3.5 + ratio * 3
          const col = ratio > 0.5 ? '#90CAF9' : ratio > 0.2 ? '#78909C' : '#546E7A'
          return <circle key={e.student_id} cx={p.x} cy={p.y} r={size} fill={col} opacity="0.88" data-testid="galaxy-mate" />
        }
        const glow = kind === 'crown' ? '#FFD700' : '#FF8C42'
        return (
          <g key={e.student_id} data-testid={`galaxy-${kind}`}>
            <circle cx={p.x} cy={p.y} r="13" fill={glow} opacity={kind === 'crown' ? 0.25 : 0.3} filter="url(#gx-blur-8)" />
            <circle cx={p.x} cy={p.y} r="9" fill={kind === 'crown' ? 'url(#gx-crown)' : 'url(#gx-you)'} />
            <text x={p.x} y={p.y} fontSize="10" textAnchor="middle" dominantBaseline="central">{kind === 'crown' ? '👑' : '⭐'}</text>
            {e.is_current_user && (
              <text x={p.x} y={p.y + 13} fontSize="9" fontWeight="700" fill={glow} textAnchor="middle" dominantBaseline="hanging">
                You
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
