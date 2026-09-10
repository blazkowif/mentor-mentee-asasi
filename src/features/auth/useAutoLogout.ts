import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from './authStore'
import { logout } from '@/services/authService'

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000
const ACTIVITY_EVENTS = ['click', 'keydown', 'pointerdown', 'scroll', 'touchstart'] as const

export function useAutoLogout() {
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return

    let timer: number | undefined

    const signOutForInactivity = async () => {
      try {
        await logout()
      } finally {
        navigate('/login', { replace: true })
      }
    }

    const resetTimer = () => {
      if (timer !== undefined) window.clearTimeout(timer)
      timer = window.setTimeout(signOutForInactivity, INACTIVITY_LIMIT_MS)
    }

    ACTIVITY_EVENTS.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      if (timer !== undefined) window.clearTimeout(timer)
      ACTIVITY_EVENTS.forEach((eventName) => window.removeEventListener(eventName, resetTimer))
    }
  }, [navigate, user])
}