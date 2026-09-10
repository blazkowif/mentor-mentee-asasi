import { useAuth } from '@/features/auth/useAuth'
import { useAutoLogout } from '@/features/auth/useAutoLogout'
import CookieNotice from '@/components/CookieNotice'
import AppRoutes from '@/routes'

export default function App() {
  // Keeps the zustand auth store in sync with the Supabase session for the
  // lifetime of the app.
  useAuth()
  useAutoLogout()

  return (
    <>
      <AppRoutes />
      <CookieNotice />
    </>
  )
}
