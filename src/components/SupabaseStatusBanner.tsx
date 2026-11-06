import { useCallback, useEffect, useState } from 'react'
import { checkSupabaseHealth, type SupabaseHealthStatus } from '@/services/supabaseHealthService'

const HEALTH_CHECK_INTERVAL_MS = 60_000

export default function SupabaseStatusBanner() {
  const [status, setStatus] = useState<SupabaseHealthStatus | null>(null)
  const [checking, setChecking] = useState(false)

  const checkHealth = useCallback(async () => {
    if (!navigator.onLine) {
      setStatus('unavailable')
      return
    }
    setChecking(true)
    try {
      setStatus(await checkSupabaseHealth())
    } catch {
      setStatus('unavailable')
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    void checkHealth()
    const interval = window.setInterval(() => void checkHealth(), HEALTH_CHECK_INTERVAL_MS)
    const handleOnline = () => void checkHealth()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void checkHealth()
    }
    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [checkHealth])

  if (status !== 'unavailable') return null

  return (
    <div role="alert" className="border-b border-amber-300 bg-amber-50 px-6 py-3 text-sm text-amber-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>
          <strong>Database temporarily unavailable.</strong>{' '}
          Supabase may be paused or waking up. Your data is not being deleted. Please wait a moment and retry.
        </p>
        <button
          type="button"
          onClick={() => void checkHealth()}
          disabled={checking}
          className="rounded border border-amber-500 px-3 py-1.5 text-xs font-medium hover:bg-amber-100 disabled:opacity-50"
        >
          {checking ? 'Checking…' : 'Retry connection'}
        </button>
      </div>
    </div>
  )
}
