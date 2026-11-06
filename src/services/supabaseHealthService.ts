const REQUEST_TIMEOUT_MS = 8000

export type SupabaseHealthStatus = 'healthy' | 'unavailable'

export async function checkSupabaseHealth(): Promise<SupabaseHealthStatus> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!url || !anonKey) return 'unavailable'

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/users?select=id&limit=1`, {
      method: 'GET',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`Supabase health check returned ${response.status}.`)
    return 'healthy'
  } finally {
    window.clearTimeout(timeout)
  }
}
