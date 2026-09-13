import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { renewLease, sessionLockOf, takeOverSession, type SessionLock } from '../../../lib/api/sessions'
import { loadTracked, setVersion } from './tracker'

export const HEARTBEAT_MS = 30_000

export function useSessionLease(sid: string, active: boolean) {
  const queryClient = useQueryClient()
  const [lock, setLock] = useState<SessionLock | null>(null)

  const handleError = useCallback((e: unknown): boolean => {
    const l = sessionLockOf(e)
    if (!l) return false
    setLock((prev) => (prev && prev.taken_over ? prev : l))
    return true
  }, [])

  const takeOver = useMutation({
    mutationFn: () => takeOverSession(sid),
    onSuccess: (res) => {
      const tracked = loadTracked(sid)
      if (tracked) setVersion(tracked, res.version)
      setLock(null)
      void queryClient.invalidateQueries({ queryKey: ['student', 'session', sid, 'bundle'] })
    },
    onError: (e) => {
      if (!handleError(e)) setLock(null)
    },
  })

  useEffect(() => {
    if (!sid || !active || lock) return
    let cancelled = false
    const beat = () => {
      if (document.hidden || cancelled) return
      void renewLease(sid).catch((e: unknown) => {
        if (!cancelled) handleError(e)
      })
    }
    const timer = window.setInterval(beat, HEARTBEAT_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [sid, active, lock, handleError])

  return { lock, handleError, takeOver, clearLock: () => setLock(null) }
}
