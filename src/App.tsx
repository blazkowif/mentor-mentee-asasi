import { useAuth } from '@/features/auth/useAuth'
import { useAutoLogout } from '@/features/auth/useAutoLogout'
import CookieNotice from '@/components/CookieNotice'
import AppRoutes from '@/routes'

export default function App() {
  // Keeps the zustand auth store in sync with the Supabase session for the
  // lifetime of the app.
  useAuth()
  const warningSeconds = useAutoLogout()

  return (
    <>
      <AppRoutes />
      <CookieNotice />
      {warningSeconds !== null && warningSeconds > 0 && (
        <div role="alert" className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">
          You will be signed out in {Math.ceil(warningSeconds / 60)} minute{Math.ceil(warningSeconds / 60) === 1 ? '' : 's'} due to inactivity. Continue using the system to stay signed in.
        </div>
      )}
    </>
  )
}
