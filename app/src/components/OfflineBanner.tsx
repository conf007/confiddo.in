import { useEffect, useState } from 'react'
import { Icon } from './icons'

export function OfflineBanner() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  if (online) return null
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-navy px-4 py-2 text-xs font-medium text-white" data-testid="offline-banner">
      <Icon name="alert" className="h-4 w-4" />
      You're offline. Reconnect to keep going — nothing is lost on the server.
    </div>
  )
}
