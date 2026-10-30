import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from './authStore'
import { logout } from '@/services/authService'

const INACTIVITY_LIMIT_MS = 20 * 60 * 1000
const WARNING_BEFORE_MS = 5 * 60 * 1000
const ABSOLUTE_SESSION_LIMIT_MS = 2 * 60 * 60 * 1000
const SESSION_STARTED_KEY = 'ppst-session-started-at'
const ACTIVITY_EVENTS = ['click', 'keydown', 'pointerdown', 'scroll', 'touchstart'] as const

export function useAutoLogout() {
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const [warningSeconds, setWarningSeconds] = useState<number | null>(null)

  useEffect(() => {
    if (!user) {
      sessionStorage.removeItem(SESSION_STARTED_KEY)
      localStorage.removeItem(SESSION_STARTED_KEY)
      setWarningSeconds(null)
      return
    }

    const rememberMe = localStorage.getItem('ppst-remember-me') === 'true'
    const sessionStore = rememberMe ? localStorage : sessionStorage
    const startedAt = Number(sessionStore.getItem(SESSION_STARTED_KEY)) || Date.now()
    sessionStore.setItem(SESSION_STARTED_KEY, String(startedAt))
    let inactivityTimer: number | undefined
    let warningTimer: number | undefined
    let countdownTimer: number | undefined
    let absoluteTimer: number | undefined

    const signOut = async () => {
      try {
        await logout()
      } finally {
        sessionStorage.removeItem(SESSION_STARTED_KEY)
        localStorage.removeItem(SESSION_STARTED_KEY)
        navigate('/login', { replace: true })
      }
    }

    const resetTimer = () => {
      if (inactivityTimer !== undefined) window.clearTimeout(inactivityTimer)
      if (warningTimer !== undefined) window.clearTimeout(warningTimer)
      if (countdownTimer !== undefined) window.clearInterval(countdownTimer)
      setWarningSeconds(null)
      warningTimer = window.setTimeout(() => {
        setWarningSeconds(WARNING_BEFORE_MS / 1000)
        countdownTimer = window.setInterval(() => {
          setWarningSeconds((seconds) => {
            if (seconds === null || seconds <= 1) return 0
            return seconds - 1
          })
        }, 1000)
      }, INACTIVITY_LIMIT_MS - WARNING_BEFORE_MS)
      inactivityTimer = window.setTimeout(signOut, INACTIVITY_LIMIT_MS)
    }

    const remainingAbsoluteMs = Math.max(0, ABSOLUTE_SESSION_LIMIT_MS - (Date.now() - startedAt))
    absoluteTimer = window.setTimeout(signOut, remainingAbsoluteMs)
    ACTIVITY_EVENTS.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      if (inactivityTimer !== undefined) window.clearTimeout(inactivityTimer)
      if (warningTimer !== undefined) window.clearTimeout(warningTimer)
      if (countdownTimer !== undefined) window.clearInterval(countdownTimer)
      if (absoluteTimer !== undefined) window.clearTimeout(absoluteTimer)
      ACTIVITY_EVENTS.forEach((eventName) => window.removeEventListener(eventName, resetTimer))
    }
  }, [navigate, user])

  return warningSeconds
}
