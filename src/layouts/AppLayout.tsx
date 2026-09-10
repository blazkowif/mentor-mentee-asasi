import { Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/authStore'
import { logout } from '@/services/authService'
import ProfileSidebar from './ProfileSidebar'

export default function AppLayout() {
  const { user, role } = useAuthStore()
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-ums-gray-light">
      <header className="flex items-center justify-between bg-ums-blue px-6 py-3 text-white">
        <span className="font-semibold">PPST Mentor-Mentee System</span>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden opacity-90 sm:inline">{user?.name} · {role}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded border border-white/40 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
          >
            Log out
          </button>
        </div>
      </header>
      <div className="flex">
        <ProfileSidebar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
