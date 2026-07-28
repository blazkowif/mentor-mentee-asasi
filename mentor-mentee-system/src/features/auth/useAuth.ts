import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentAppUser } from '@/services/authService'
import { useAuthStore } from './authStore'

/**
 * Mount once (in App.tsx) to keep the auth store in sync with the Supabase
 * session — including reacting to sign-in/sign-out from other tabs.
 */
export function useAuth() {
  const { user, role, isLoading, setUser, setLoading } = useAuthStore()

  useEffect(() => {
    let mounted = true

    getCurrentAppUser()
      .then((appUser) => {
        if (mounted) setUser(appUser)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setUser(null)
        return
      }
      const appUser = await getCurrentAppUser()
      setUser(appUser)
    })

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [setUser, setLoading])

  return { user, role, isLoading }
}
