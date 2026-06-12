/**
 * App-switch counting for an active session.
 *
 * Mirrors the Flutter lifecycle observer: an absence only counts when the
 * student is away for MORE than 30 seconds (ARCHITECTURE.md §8.2 —
 * "app-switch counting > 30 s via visibilitychange"). The count is passed to
 * POST .../complete as app_switches; the BACKEND applies the penalty
 * (first -2, each additional -3, gamification_service.py:291) — the client
 * never deducts XP itself.
 *
 * hiddenAt is persisted via the tracker so closing/restoring the tab within
 * the same browser session still measures the absence.
 */
import { useEffect } from 'react'
import { loadTracked, saveTracked } from './tracker'

const ABSENCE_THRESHOLD_MS = 30_000

export function useAppSwitchTracking(sessionId: string | undefined, active: boolean) {
  useEffect(() => {
    if (!sessionId || !active) return

    const onVisibility = () => {
      const session = loadTracked(sessionId)
      if (!session || session.completion) return
      if (document.hidden) {
        saveTracked({ ...session, hiddenAt: Date.now() })
      } else if (session.hiddenAt) {
        const away = Date.now() - session.hiddenAt
        saveTracked({
          ...session,
          hiddenAt: undefined,
          appSwitches:
            away > ABSENCE_THRESHOLD_MS
              ? session.appSwitches + 1
              : session.appSwitches,
        })
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [sessionId, active])
}
