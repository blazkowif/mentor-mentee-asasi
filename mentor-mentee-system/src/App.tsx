import { useAuth } from '@/features/auth/useAuth'
import AppRoutes from '@/routes'

export default function App() {
  // Keeps the zustand auth store in sync with the Supabase session for the
  // lifetime of the app.
  useAuth()

  return <AppRoutes />
}
