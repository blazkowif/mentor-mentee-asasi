import { Navigate, Outlet } from 'react-router-dom'
import type { UserRole } from '@/types/database.types'
import { useAuthStore } from '@/features/auth/authStore'

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
}

/**
 * Wrap route groups that require auth. Pass `allowedRoles` to also restrict
 * by role (e.g. admin-only pages) — unauthorized users are bounced to their
 * own dashboard rather than an error page.
 */
export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, role, isLoading } = useAuthStore()

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading…</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
